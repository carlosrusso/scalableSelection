# Scalable selection in large datasets in CDF’s FilterComponent

## Summary

The services team periodically asks for selectors that support inversion of selection, in paginated scenarios, which is currently not supported.
 
This is however a particular case around expressing the selected items as a list of included terms and a list of excluded terms.
Alternatively, one could express a selection as a set of conditions.

We propose 

The naive approach involves modifying CDF's FilterComponent to capture the intention of the user and writing a PDI transformation that patches an MDX expression into a query template, eventually running the resulting query.

The same approach would probaly also work for SQL datasources, but such explorations may not be possible in the 3-day timeframe of this hackathon.

## Introduction

The `FilterComponent` is an extensible component designed for selecting items or groups of items from a list, and which is bundled with CDF.

The current behavior is merely inclusive: the user selects which items should be included in the selection. The selection is expressed extensively, in the sense that all the elements of the set are

Some customers have however shown interest in operations such as:

1. Select all items except a few items
2. Toggling the selection

If the dataset is small enough to fit the client device, all the items in the list are known and it is possible to keep the extensional approach. Toggling the selection simply means that the selection state of each item is flipped.

However, as soon as the dataset becomes large and pagination is activated, the component does not have immediate access to the full list of items and cannot thus generate the extensive list of items included in the selection. An intensional approach must thus be followed.

In this case, the operations above can be implemented by expressing the selection with two clauses: the list of explicity included items and the list of excluded items.

Take the following example, inspired in a single-level MDX dimension 'Fruits', containing all known fruits. The `id` of each node in the filter is thus populated with the corresponding fully qualified name. 
Two possible selection states would be:

1. `[ '[Fruits].[Orange]', '[Fruits].[Pear]', '[Fruits.Strawberry]' ]`
2. `[ '[Fruits]' ]` except `[ '[Fruits].[Apple]', '[Fruits].[Banana]' ]`

To materialize the user’s selection into the correct dataset, the selection state must be conveyed to the server (and to the datasource at play).
To properly support the second case, the selection state must be serialized into something else than an array of identifiers.

VizAPI 3.0 already contains a set of classes (under `pentaho.type.filter`) for expressing a condition intensionally in a disjunctive normal form (ORs of ANDs): 

    A OR (B AND C) OR (NOT D)  

The examples of selection states above can be rewritten using a subset of the filter classes: the operators `AND`, `OR`, `NOT` and `IsIn`. For instance, the example above could be expressed as:

1. `IsIn('id', ['[Fruits].[Orange]', '[Fruits].[Pear]', '[Fruits].[Strawberry]'])`
2. `IsIn('id',['Fruits']) AND NOT IsIn('id', ['Fruits].[Apple]', '[Fruits].[Banana]'])`

We need only to augment the backend with the capability to transform these expressions into the equivalent MDX statements.


## Proof of concept, using an MDX datasource

Have a CDE dashboard with a `FilterComponent` and a `TableComponent`.

The `FilterComponent` is set up to initially show 10% of the data. 

Let the user select a bunch of items from the list. The user should be able to select all items except a few, and invert the selection state within a group of items.
As the user scrolls down, more items are loaded, and their selection state should be coherent with the intention that the user expressed previously (if he/she clicked “select all”, the new items must be shown as selected).

The table reacts to the changes of the `FilterComponent` and displays data concerning the items that match the selection. 

To do that, the user writes the following query template for the table:

```
WITH
  SET [COLS] AS {[Measures].[Sales]}
  ${SetFilterExpression}

SELECT
  [COLS] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]
```

then, depending on the state of the filter, the parameter `SetFilterExpression` assumes different values:

```
-- Single dimension, a given set of items 
SET ROW_SET as {[Markets].[APAC].[Australia].[NSW].[Chatswood]}

-- Single dimension, ALL items 
SET ROW_SET as [Markets].[City].MEMBERS

-- Single dimension, EXCLUDE a given set of items 
SET Items as {[Markets].[APAC].[Australia].[NSW].[Chatswood]}
SET ROW_SET as EXCEPT([Markets].[City].MEMBERS, Items)
```

As a result, the table is fed with a variable number of items.

The only inovation here is the fact that a string holding an expression was transformed into a set of MDX statements: a set `ROW_SET` was created behind the scenes.
 
Since the `FilterComponent` supports groups of options, it could be populated with a set of dimensions and its members. In that case, the MDX statements such as the following could be generated: 
 
```
SET Items as {[Markets].[APAC].[Australia].[NSW].[Chatswood]}
SET Line as {[Product Line].[Line].[Planes]}
SET ROW_SET as EXCEPT([Markets].[City].MEMBERS, Items) *  EXCEPT([Product Line].[Line].MEMBERS, Line) * ...
```

where each additional dimension introduces a `CROSSJOIN`.
In the case NULLs are to be eliminated, `NONEMPTYCROSSJOIN` could be used instead.

```
SET Items as {[Markets].[APAC].[Australia].[NSW].[Chatswood]}
SET Line as {[Product Line].[Line].[Planes]}
SET ROW_SET as NONEMPTYCROSSJOIN(EXCEPT([Markets].[City].MEMBERS, Items), EXCEPT([Product Line].[Line].MEMBERS, Line))
```

By further manipulating `ROW_SET`, more complex query template could be built.

## Tasks

The main effort around this project will most likely be the discussion of how to capture the user’s intention.

The actual implementation of the project will probably consist of the following:

1. Enrich a custom version of the `FilterComponent` with UX elements and logic that allows capturing the user’s intention. A simplistic approach could be a button that toggles the type of selection to occur in a given group (inclusion or exclusion)
2. Customize the `FilterComponent` to export the selection as a serialized `pentaho.type.filter` object.
3. Create a PDI transformation (or a custom datasource driver) that accepts a serialized `pentaho.type.filter` object, and transforms it into the correct MDX/SQL snippet. The generated snippet is then injected into a query template supplied by the user. The corresponding query is executed and the results are returned.


## Possible colateral benefits

### Simpler MDX query templates

Currently, the CDF/CDA transform a list of items to a CSV string.
MDX has limited semantics to combine two arbitrary lists of items.
Implementors sometimes struggle with overly complicated queries that circumvent those limitations.

In contrast, by de-serializing the `pentaho.type.filter` expressions, several expressions can be combined and manipulated prior to triggering the server requests.
This has the potential of shifting some of the logic outside of the queries, which might lead to simpler queries and faster development cycles.

### SQL 
The same approach can probably be readily extended to SQL datasources, with little effort. Stretch goal?


## Appendix: notes on `pentaho.type.filter`
The examples provided above were writen in a pseudo-code syntax.
As of January 2017, the serializations are as follows:

### List of included items
The expression

`IsIn('id', ['[Fruits].[Orange]', '[Fruits].[Pear]', '[Fruits].[Strawberry]'])`

would be serialized as:

```
{
  "_": "pentaho/type/filter/isIn",
  "property": "id",
  "values": [
    {_: "string", v: "[Fruits].[Orange]"},
    {_: "string", v: "[Fruits].[Pear]"},
    {_: "string", v: "[Fruits].[Strawberry]"},
  ]
}
```

### List with excluded items
The expression

`IsIN('id','Fruits') AND NOT IsIN('id', ['[Fruits.Apple', '[Fruit.Banana'])`

would be serialized as:

```
  {
    "_": "pentaho/type/filter/and",
    "operands": [
      {
        "_": "pentaho/type/filter/isIn",
        "property": "id",
        "value": {_: "string", v: "[Fruits]"}
      },
      {
        "_": "pentaho/type/filter/not",
        "operand":  {
		        "_": "pentaho/type/filter/isIn",
		        "property": "id",
		        "values": [
		          {_: "string", v: "[Fruits].[Apple]"},
		          {_: "string", v: "[Fruits].[Banana]"}
		        ]
        }
      }
    ]
  }
```



## Appendix: notes on MDX

To refer to a set of members, MDX distinguishes the following cases:

* NONE : no member of the dimension is selected
* ALL: all members are selected
* AGG: all members are aggregated as if they were a single member
* INCLUDE: a list of members to include in the selection
* EXCLUDE: all members are selected except for those in a list

This distinction implies that our magic code must branch at some point to generate the correct snippet of MDX.

### Example

Assuming the user writes the following query template:

```
WITH

SET [COLS] AS {[Measures].[Sales]}

${SetFilterExpression}

SELECT
  [COLS] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]
```

Depending on the state of the filter, the parameter `SetFilterExpression` assumes different values:

```
-- Single dimension, a given set of items 
SET ROW_SET as {[Markets].[APAC].[Australia].[NSW].[Chatswood]}

-- Single dimension, ALL items 
SET ROW_SET as [Markets].[City].MEMBERS

-- Single dimension, EXCLUDE a given set of items 
SET Items as {[Markets].[APAC].[Australia].[NSW].[Chatswood]}
SET ROW_SET as EXCEPT([Markets].[City].MEMBERS, Items)


-- Other examples, for multiple dimensions
SET ROW_SET as NONEMPTYCROSSJOIN(EXCEPT([Markets].[City].MEMBERS, Items), EXCEPT([Product Line].[Line].MEMBERS, Line))

SET ROW_SET as CROSSJOIN(EXCEPT([Markets].[City].MEMBERS, Items), EXCEPT([Product Line].[Line].MEMBERS, Line))

SET ROW_SET as EXCEPT([Markets].[City].MEMBERS, Items) *  EXCEPT([Product Line].[Line].MEMBERS, Line) * ...
```

<!--
### Use case ALL MEMBERS == NO MEMBERS
#### Template
Parameters: 

* {{levelParam}} = [dimension].[level]

```
WITH
MEMBER [Measures].[MyMeasureName] as {{levelParam}}.CurrentMember.Name

SET [COLUMN_SET] AS [Measures].[MyMeasureName]
SET [ROW_SET] AS {{levelParam}}.Members

SELECT
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [${cube}]
```

#### Instance

```
WITH
MEMBER [Measures].[PL] AS [Product].[Line].CURRENTMEMBER.Name

SET [COLUMN_SET] AS [Measures].[PL]
SET [ROW_SET] AS {[Product].[Line].MEMBERS};

SELECT
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]
```

### Use case INCLUDE
Parameters: 

* {{levelParam}} = [dimension].[level];   
* {${memberParam}} =  *{[Member1], [Member2], ...[MemberN]}

#### Template

```
WITH
MEMBER [Measures].[MyMeasureName] as ${levelParam}.CurrentMember.Name

SET [COLUMN_SET] AS [Measures].[MyMeasureName]
SET [ROW_SET] AS {${levelParam}}.{${memberParam}}

SELECT
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [${cube}]
```

#### Instance
Parameters:

* ${levelParam} = [Product].[Line];     
* {${memberParam}} = {[cars],[motos,[boat]}

```
WITH
  MEMBER [Measures].[PL] AS [Product].[Line].CURRENTMEMBER.Name

  SET [COLUMN_SET] AS [Measures].[PL]
  SET [ROW_SET] AS {${levelParam}}.{${memberParam}}

SELECT
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]
```

### Use case: AGG (MEMBER ALL)
### Template
Parameters:

* ${dimensionParam}
* ${levelParam}
* {${memberParam}}

```
WITH
MEMBER [Measures].[MyMeasureName] as ${dimensionParam}.${levelParam}.CurrentMember.Name

SET [COLUMN_SET] AS [Measures].[MyMeasureName]

SET [ROW_SET] AS ${dimensionParam}.[All ${dimensionParam}s] -- or the specific name of member all when it exists;

SELECT
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [${cube}]
```

#### Instance

```
WITH 
  MEMBER [Measures].[PL] AS [Product].[Line].CURRENTMEMBER.Name

SET [COLUMN_SET] AS [Measures].[PL]
SET [ROW_SET] AS {[Product].[All Products];

SELECT 
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]
```

### Use case: EXCEPT

Parameters:

* ${levelParam} = [dimension].[level];     {${memberParam}} = {[member1],[member2,[memberN]}


#### Template

```
WITH
MEMBER [Measures].[MyMeasureName] as ${levelParam}.CurrentMember.Name

SET [COLUMN_SET] AS [Measures].[MyMeasureName]

SET [ROW_SET] AS EXCEPT(${levelParam}.Members,{${levelParam}}.{${memberParam}})


SELECT
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [${cube}]
```

#### Instance
Parameters:

* ${levelParam} = [Product].[Line];     {${memberParam}} = {[cars],[motos],[boat]}

```
WITH
MEMBER [Measures].[PL] AS [Product].[Line].CURRENTMEMBER.Name

SET [COLUMN_SET] AS [Measures].[PL]

SET MembersToExclude as {${memberParam}}

SET [ROW_SET] AS EXCEPT(${levelParam}.Members, MembersToExclude);

SELECT
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]
```

### Examples
#### Steelwheels example 1
```
WITH

SET [COLS] AS {[Measures].[Sales]}

SET Items AS [Markets].[City].MEMBERS
-- SET Items AS {[Markets].[APAC].[Australia].[NSW].[Chatswood]}

--  SET FilterExpression AS EXCEPT([Markets].[City].MEMBERS, Items)
SET FilterExpression AS {Items}

SET [ROW_SET] AS FilterExpression

SELECT
  [COLS] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]
```

-->

# Organization

## Use cases

### Invert the current selection 
This is not currently possible.

The inversion can be done per-group, and acts recursively on any subgroups.

Possible transitions
  * NONE -> ALL
  * ALL -> NONE
  * INCLUDE -> EXCLUDE
  * EXCLUDE -> INCLUDE

Note: This assumes the filter does not discard downloaded items. It could only discard items that are compatible with the current state of the group. When the filter is in INCLUDE or EXCLUDE modes, the absent items are all assumed to be in the same state (unselected or selected, respectively)

### Select all

Selecting all items marks both the currently downloaded items as selected, as well as the items on the server. 
This means that the selection of a group cannot be strictly inferred from the state of the currently downloaded children.

# Random stuff

Possible states: NONE, INCLUDE, EXCLUDE, ALL

1. Clearing the group selection -> switch to NONE
2. Setting the group selection -> switch to ALL

1. Setting the group selection -> switch to ALL
2. Clearing the group selection -> switch to NONE

1. Clearing the group selection -> switch to NONE
2. Clicking on a item (select) -> switch from NONE to INCLUDE

1. Setting the group selection -> switch to ALL
2. Clicking on a item (unselect) -> switch from ALL to EXCLUDE




INCLUDE





EXCLUDE

SET [ROW_SET] as {EXCEPT(DESCENDANTS([PAI].MEMBERS, [PAI].[FILHO]),{[PAI].[Filho1].[1.2],[PAI].[Filho2].[2.2]})}


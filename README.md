# Scalable selection in large datasets in CDF’s FilterComponent

The services team periodically asks for selectors that support inversion of selection, in paginated scenarios. This is however a particular case around expressing the selected items as a list of included terms and a list of excluded terms.
The naive approach involves modifying CDF's FilterComponent to capture the intention of the user and writing a ktr that generates an MDX query.

## The problem to solve

The `FilterComponent` is an extensible component designed for selecting items or groups of items from a list, and which is bundled with CDF.

The current behavior is merely inclusive: the user selects which items should be included in the selection. The selection is expressed extensively, in the sense that all the elements of the set are

Some customers have however shown interest in operations such as:

1. Selection all items except a few items
2. Toggling the selection

If the dataset is small enough to fit the client device, all the items in the list are known and it is possible to keep the extensional approach. Toggling the selection simply means that the selection state of each item is flipped.

However, as soon as the dataset becomes large and pagination is activated, the component does not have immediate access to the full list of items and cannot thus generate the extensive list of items included in the selection. An intensional approach must thus be followed.

In this case, the use cases above can be implemented by expressing the selection with two clauses: the list of explicity included items and the list of excluded items:

1. `[Bananas, Pears, Strawberries]`
2. `[All fruits]` except `[Apples, Oranges]`
3. `[Cakes, [All fruits]` except `[Apples, Oranges], Potatoes]`

To materialize the user’s selection into the correct dataset some extra interaction with the server and the datasource at play are necessary, because only these entities have access to the full dataset.

## Background: What we can leverage

VizAPI 3.0 already contains a set of classes (pentaho.type.filter) for expressing a condition intensionally in a disjunctive normal form (ORs of ANDs).

Here, we can use these classes (or follow a similar approach) but restrict the set of operator to be used to AND, OR, NOT and IsIN. For instance, the example above could be expressed as:

1. `IsIn([Bananas, Pears, Strawberries])`
2. `IsIn([All fruits]) AND NOT IsIN([Apples, Oranges])`
3. `IsIn([Cakes) OR ( IsIN([All fruits]) AND NOT IsIN([Apples, Oranges]) )`

By wrapping a real-life datasource in a magical PDI transformation, it should be possible to assemble the correct statements for both MDX and SQL datasources.

The services team at Portugal has some experience with real-life scenarios and has invested some effort towards implementing some of these ideas with specific customers.

## Proof of Concept

The main effort around this project will most likely be the discussion of how to capture the user’s intention.

The actual implementation of the project will probably consist of the following:

1. Enrich a custom version of the FilterComponent with UX elements and logic that allows capturing the user’s intention. A simple approach could be a button that toggles the type of selection to occur in a given group (inclusion or exclusion), but I suspect more should be possible, especially if a UX person joins this project
2. Create a function that exports the selection as a serialized pentaho.type.filter object.
3. Create a PDI transformation that transforms the serialized pentaho.type.filter object into the correct MDX/SQL.

Given the limited time, we should focus first on MDX, which ought to be easier.

## Example

Have a CDE dashboard with a FilterComponent and a TableComponent.

The FilterComponent initially shows 10% of the data, and let the user select a bunch of items from the list. The user should be able to select all items except a few, and invert the selection state within a group of items.

As the user scrolls down, more items are loaded, and their selection state should be coherent with the intention that the user expressed previously (if he/she clicked “select all”, the new items must be shown as selected).

The TableComponent reacts to the changes of the FilterComponent and displays the data that match the selection. The TableComponent uses the magical ktr as a datasource, which in turn consumes the expression output by the FilterComponent.

## Possible benefits

Things that this work may allow us to do with none or some extra effort.

## Notes on MDX

To refer to a set of members, MDX distinguishes the following cases:

* NONE : no member of the dimension is selected
* ALL: all members are selected
* AGG: all members are aggregated as if they were a single member
* INCLUDE: a list of members to include in the selection
* EXCLUDE: all members are selected except for those in a list

This distinction implies that our magic code must branch at some point to generate the correct snippet of MDX.

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

 Instance
-- ${levelParam} = [Product].[Line];     {${memberParam}} = {[cars],[motos,[boat]}
WITH

MEMBER [Measures].[PL] AS [Product].[Line].CURRENTMEMBER.Name

SET [COLUMN_SET] AS [Measures].[PL]
SET [ROW_SET] AS {${levelParam}}.{${memberParam}}

SELECT
  [COLUMN_SET] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]

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

#### Example 2

Query template:

```
WITH

SET [COLS] AS {[Measures].[Sales]}

${SetFilterExpression}

SELECT
  [COLS] ON COLUMNS,
  [ROW_SET] ON ROWS
FROM [SteelWheelsSales]
```

Possible values for `SetFilterExpression`

```
-- Single dimension 
SET ROW_SET as EXCEPT([Markets].[City].MEMBERS, Items)
SET ROW_SET as [Markets].[City].MEMBERS

-- Multiple dimensions
SET ROW_SET as NONEMPTYCROSSJOIN(EXCEPT([Markets].[City].MEMBERS, Items), EXCEPT([Product Line].[Line].MEMBERS, Line))
SET ROW_SET as CROSSJOIN(EXCEPT([Markets].[City].MEMBERS, Items), EXCEPT([Product Line].[Line].MEMBERS, Line))
SET ROW_SET as EXCEPT([Markets].[City].MEMBERS, Items) *  EXCEPT([Product Line].[Line].MEMBERS, Line) * ...
```
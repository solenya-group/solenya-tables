# Solenya Tables

 * A databound table with filtering, sorting, and paging for solenya.
 * A MasterDatail component for routed drill downs (e.g. drilldown from a customer table to a particular customer)

# Installation

Assuming you have `solenya` installed, you will need the following npm packages:

```
solenya-tables
bootstrap
popper.js
```
Currently `solenya-tables` superficially depends on bootstrap for styling & menus. That dependency will be removed in the future.

# Table Usage
The usage of `Table<T>` is as follows:

```typescript
export class TableSample extends Component
{
    @transient table = new PresidentTable ()
}

class PresidentTable extends Table<President>
{
    @Type (() => President) results?: President[]

    attached() {
        this.doLoad()
    }   

    async load (query: ITableQuery) {   
        return presidents
    }

    view() {
        const o = new President()
        return super.view ({css: tableStyle, guideObject: o, columns:
        [
            { prop: () => o.name, sortable: true },
            { prop: () => o.age, label: "Age Inaugurated", sortable: true }
        ]})    
    }
}
```
Where `President` is defined as:

```typescript
class President extends Component
{    
    name = ""
    age?: number    
}
```
The `@Type` decorator tell's the `class-transformer` serialization package the type of the array. The `guideObject` gives `Table<T>` metadata about `T` so it can automatically detect column information like label values. This is necessary because unlike in Java or C#, the type of an array is only known at compile time.

You need to implement the `load` method on table to get data into your table. It takes an `ITableQuery` object and returns a promise to an `ITableResult<T>` object. Their definitions arre:

```typescript
export interface ITableQuery
{
    from: number
    pageSize: number
    search?: string
    sort?: string
}

export interface ITableResult<T>
{
    total: number
    results?: T[]
}
```
The `Table<T>` type maintains its current page, search filter, and sort values. These values will be fed to the `ITableQuery` object that's passed to the load method.

# Column

The `Column` type allows you to customize the property that's displayed using the `display` field. If we added a `date` field to `President`, then we could display that date with another column, as follows:

```typescript
columns: [
    ...
    {
        prop: () => o.date,
        display: p => "" + p.date.getFullYear(),
        sortable: true
    }
]
```

We can let users filter the table by a column value by giving them options on that column to filter by. In this example, we can add a `party` field to `President`, and then let the user filter presidents by party options :

```typescript
columns: [
    ...
    {
        prop: () => o.party,
        sortable: true,
        options: parties.map(p => ({
            label: p.party,
            value: "is:"+p.party
        }))
    }
}
```

When the user chooses the option, the `load` method will be called, where the `search` field on `ITableQuery` is set to the value you gave for that option.

Here we perform the filtering locally using the `arrayToTableResult` convenience method. This will automatically apply sorting and paging (you must provide the filtering). If the result set was large, we'd instead need to perform the filtering, sorting, and paging on the server.

```typescript
class PresidentTable {
    ...    
    async load (query: ITableQuery)
    {        
        return this.arrayToTableResult (presidents, r => r.filter (this.search))
    }
}

class President {
    ... 
    // would instead be implemented on server if results set was large
    filter (search?: string)
    {
        if (! search)
            return true

        if (search.startsWith ("is:"))
            return this.party == search.substring ("is:".length)

        const reg = new RegExp (search, "i")
        return reg.test (this.name)
    }
}
```

# Master Detail

It's very common to want to drill down on a particular row, where the route is updated accordingly. We can do that using a `MasterDetail` component, as follows:

```typescript
export class TableSample extends MasterDetail<President>
{
    @transient table = new PresidentTable ()

    async getItem (name: string) {
        return presidents.find (p => p.routeName == name)
    }  
}
```
Where we augment `President` as follows:

```typescript
class President extends Component implements IRouted
{    
    @transient router: Router = new Router (this)
    @transient get routeName() { return encodeURIComponent (this.name.replace (/ /g, "_")) }

    @Label("Inaugurated")
    @Type(() => Date) date!: Date
    name = ""
    party = ""    
    @Label("Age Inaugurated") age?: number    

    view() {
        return (
            div({ class: "card" },
                div({ class: "card-header" },
                    this.router.parent!.navigateLink("", "Go to table")
                ),
                div({ class: "card-body" },
                    labeledValue (this, () => this.name),
                    labeledValue (this, () => this.party),
                    labeledValue (this, () => this.age),
                    labeledValue (this, () => this.date, x => x.getFullYear())                    
                )
            )
        )
    }
}
```
`MasterDetail` uses Solenya's composable router. This means the relationship between the master (table of presidents) and detail (particular president) is encapsulated in your component. You can then insert that component within another route, without having to alter global configuration for your routes.

For convenience, the `MasterDetail` can display a search box that shows its current `search` value:

```typescript
export class TableSample extends MasterDetail<President>
{
    ...
    view() {
        return super.view({
            showSearchBox: true
        })
    }
}
```
# Table<T> without a Table

`Table<T>` provides the logic of filtering, paging, and sorting over a set of objects of type T. By default, its view method provides an HTML table view of its state, but you can override its view method to provide a non table UI.

```typescript
class PresidentTable {
    ...    
    view() : VElement {
        // provide your own view
    }
}
```
# PageSize

You can specify the `pageSize` when creating a `Table<T>`:

```typescript
    new Table<President> ({ pageSize: 20 })
```
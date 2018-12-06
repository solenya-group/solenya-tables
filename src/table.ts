import { orderBy } from 'lodash'
import { debounce } from 'lodash-decorators'
import { commandLink, Component, div, equalsIgnoreCase, getFriendlyName, inputText, isNullOrEmpty, key, table, tbody, td, th, thead, tr, VElement, transient } from "solenya"
import { MenuOption, menuView } from './menu'
import { ITableQuery, SortValue, Column, TableViewProps, ITableResult, TableProps } from './tableTypes'

export abstract class Table<T> extends Component implements ITableQuery, ITableResult<T>
{       
    abstract results?: T[]
    total?: number

    @transient from = 0
    @transient pageSize = 10       
    @transient sort = ""
    @transient _search = ""

    constructor (props: TableProps = {}) {
        super()
        if (props.pageSize)
            this.pageSize = props.pageSize
    }
    
    getQuery() : ITableQuery {
        return {
            from: this.from,
            pageSize: this.pageSize,
            search: this.search,
            sort: this.sort
        }
    }

    /**
     * return a promise to an ITableResult<T>:
     * {
     *      results:T[]
     *      total: number     
     * }        
     */
    abstract load (query: ITableQuery) : Promise<ITableResult<T>|undefined>
    
    /** Trigger the load method and write the results back, if not undefined, to this table. */
    async doLoad() {
        const newTable = await this.load (this.getQuery())

        if (newTable)
            this.update (() => {
                this.results = newTable.results                        
                this.total = newTable.total        
            })       
        
        return newTable != null
    }

    /** A convenience method when you want to implement load by filtering a local array. */
    arrayToTableResult (array: T[], filter: (row: T) => boolean)
    {
        let rows = array

        if (this.search && this.search != "")        
            rows = rows.filter (filter)
     
        const sortValues = this.sortValues()
        if (sortValues.length)
            rows = orderBy (rows, sortValues[0].key, sortValues[0].ascending ? undefined : "desc")        
        
        return <ITableResult<T>>{
            total: array.length,
            results: rows.slice (this.from, this.from + this.pageSize) 
        }
    }

    @transient
    get search() {return this._search}

    set search (value: string) {
        if ((this._search || "") != (value || "")) {
            this._search = value
            this.doSearch()
        }
    }

    @transient
    get hasMoreResults() {
        return this.total == null || this.from + this.pageSize <= this.total
    }

    sortValues() : SortValue[] {
        return decodeSortValues (this.sort)
    }

    private canPrev() {
        return this.from > 0
    }

    private canNext() {
        return this.hasMoreResults
    }

    private prev() {
        this.from = Math.max (0, this.from - this.pageSize)
        this.doLoad()
    }

    private next() {
        this.from = this.from + this.pageSize
        this.doLoad()
    }

    @transient @debounce (300)   
    private doSearch () {        
        this.from = 0
        this.doLoad()
    }

    doSort (key: string, direction: boolean)
    {
        this.sort = encodeSortValues ([{key: key, ascending: direction}])
        this.doLoad()
    }
    
    view (props?: TableViewProps<T>) {   
        return (
            div (
                ! this.results || ! props ? undefined : this.content (props),
                this.pager()
            )
        )
    }

    content (props: TableViewProps<T>): VElement {        
        return div (
            table ({class: props.css},
                thead (
                    props.columns.map (col => th (this.columnHeader (col, props.guideObject)))
                ),
                tbody (
                    this.results!.map (row =>
                        tr (
                            props.columns.map (col =>
                                td (
                                    ! col.display ?                                                                                
                                        row[typeof(col.prop) == "string" ? col.prop : key (col.prop)] :
                                        col.display (row)
                                )
                            )
                        )
                    )
                )
            )
        )
    }    

    private pager() {
        return (
            div ({class: 'row', style: {margin: '1rem -0.5rem'}},
                [                
                    ! this.canPrev() ? null : commandLink ({ onclick: () => this.prev() } , "Previous"),
                    ! this.results!.length ? "No results." : `${this.from + 1} to ${this.from + this.results!.length} of ${this.total}`,
                    ! this.canNext() ? null : commandLink ({ onclick: () => this.next() }, "Next")                    
                ]
                .filter (x => x != null)
                .map (x => div ({class: 'mx-2 d-flex align-items-center'}, x))
            )
        )
    }       

    columnHeader (col: Column<T>, guideObject?: T)
    {
        const lbl = col.label || getFriendlyName (guideObject, col.prop)

        if (! col.sortable && ! col.options)
            return lbl
        
        const search = this.search

        return menuView ({
            label: lbl,
            isSelected:
            ! col.options ? false : col.options.filter (x => equalsIgnoreCase (search, x.value)).length > 0,
            options: [
                ...this.sortMenu (col),                
                ...(
                    ! col.options || ! col.options.length ? [] :
                    [
                        ...col.sortable ? [{ label: "" }] : [],
                        ...col.options.map (o => <MenuOption>
                        {
                            label: o.label + (equalsIgnoreCase (search, o.value) ? " ✓" : ""),
                            action: () => this.search = o.value
                        })
                    ]
                ),
                ... (
                    isNullOrEmpty (search) ? [] :
                    [
                        { label: ""},
                        <MenuOption> { label: "Clear Filter", action: () => this.search = ""}
                    ]
                )
            ]
        })        
    }

    private sortMenu(col: Column<T>) {
        const property = typeof(col.prop) == "string" ? col.prop : key (col.prop)    
        return ! col.sortable ? [] :
        [
            { label: "Sort Ascending" + this.tick (property, true), action: () => this.doSort (property, true)},
            { label: "Sort Descending" + this.tick (property, false), action: () => this.doSort (property, false)}
        ]
    }

    private tick (property: string, ascending: boolean) {
        if (! this.sortValues().length)
            return ""
        const sort = this.sortValues()[0]
        return sort.key == property && ascending == sort.ascending ? " ✓" : ""
    }

    searchInput() {
        return (            
            div ({ class: "d-flex align-items-center" },
                inputText ({
                    target: this,
                    prop: () => this.search,
                    attrs: {                
                        placeholder: "Search",
                        class: 'form-control',
                        style: { width: "300px"}
                    }
                }),
                isNullOrEmpty (this.search) ? undefined :
                    commandLink ({ onclick: () => { this.search = ""}, class: "ml-2"}, "Clear")
            )
        )
    }
}

const encodeSortValues = (values: SortValue[]) =>
    values.map (v => v.key + (v.ascending ? "" : " desc") ).join (",")

function decodeSortValues (sort: string)
{
    if (isNullOrEmpty (sort))
        return []
    
    const values = sort.split (",")
    return <SortValue[]> values.map (v =>
        {
            const parts = v.split (" ")
            if (! parts.length)
                return undefined    
            return <SortValue>{ key: parts[0], ascending: parts.length < 2 || parts[1] != "desc" }
        })
        .filter(v => v != null)
}
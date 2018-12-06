import { PropertyRef, HValue } from 'solenya'

export interface ITableQuery
{
    from: number
    pageSize: number
    search?: string
    sort?: string
}

export interface ITableResult<T>
{
    total?: number
    results?: T[]
}

export interface TableProps {
    pageSize?: number
}

export interface TableViewProps<T>
{
    css?: string
    columns: Column<T>[]
    guideObject: T
}

export interface Column<T> {
    prop: PropertyRef<any>,
    label?: string,
    display?: (row: T) => HValue,
    options?: FieldOption[],
    sortable?: boolean
}

export interface FieldOption
{
    value: string
    label: string
}

export interface SortValue
{
    key: string
    ascending: boolean
}
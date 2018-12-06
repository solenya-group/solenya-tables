import { Component, Router, IRouted, div, isNullOrEmpty, br } from 'solenya'
import { Table } from './table'

export abstract class MasterDetail<T extends IRouted> extends Component implements IRouted
{
    router: Router = new Router(this)
    routeName = ""
    abstract table: Table<T>
    detail?: T

    abstract getItem(name: string): Promise<T | undefined>

    async beforeNavigate (childPath: string) {
        if (childPath.indexOf("/") == 0)
            childPath = childPath.substr(1)

        if (isNullOrEmpty (childPath)) {
            await this.table.doLoad()
            return true
        }

        this.detail = await this.getItem (childPath)
        return this.detail != null
    }

    view (props?: MasterDetailViewProps) {
        return this.router.currentChildComponent ?
            this.router.currentChildComponent.view() :
            ! this.table.results ? div() :
            ! props || ! props.showSearchBox ? this.table.view() :
               div (
                  this.table.searchInput(),
                  br(),              
                  this.table.view()
              )                  
    }
}

export type MasterDetailViewProps = {
    showSearchBox?: boolean
}
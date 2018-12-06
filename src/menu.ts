import { a, commandLink, div, VElement, HAttributes } from "solenya"

export type MenuOption = {
    label: string | VElement,
    action?: () => void    
}

interface MenuViewProps {
    label: string
    isSelected: boolean,
    options: MenuOption[]  
    attrs?: HAttributes 
}

export const menuView = (props: MenuViewProps) =>
    div ({class: "dropdown"},
        a (
            props.attrs || {},
        {            
            class: 'dropdown-toggle d-flex align-items-center mr-2',
            "data-toggle": "dropdown",
            style: {
                cursor: 'pointer',
                $nest : {
                    "&::after": {
                        color: props.isSelected ? "orange": undefined
                    }
                }
            }
        },    
            props.label,
        ),
        div ({ class: 'dropdown-menu'},
            props.options.map (i => 
                ! i.action ? div ({class: "dropdown-divider"}) :
                commandLink ({ onclick: i.action, class: "dropdown-item"}, i.label)
            )
        )
    )
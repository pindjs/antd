import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  MenuOutlined,
  PlusOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { AntdIconProps } from '@ant-design/icons/lib/components/AntdIcon'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrayField } from '@formily/core'
import {
  ReactFC,
  RecordScope,
  RecordsScope,
  Schema,
  useField,
  useFieldSchema,
} from '@formily/react'
import { clone, isValid } from '@formily/shared'
import { Button, ButtonProps } from 'antd'
import cls from 'classnames'
import React, { createContext, forwardRef, useContext } from 'react'
import { usePrefixCls } from '../__builtins__'
import useStyle from './style'

export interface IArrayBaseAdditionProps extends ButtonProps {
  title?: string
  method?: 'push' | 'unshift'
  defaultValue?: any
}

export interface IArrayBaseContext {
  props: IArrayBaseProps
  field: ArrayField
  schema: Schema
}

export interface IArrayBaseItemProps {
  index: number
  record: ((index: number) => Record<string, any>) | Record<string, any>
}

type CommonProps = AntdIconProps & {
  index?: number
}

export type ArrayBaseMixins = {
  Addition: ReactFC<IArrayBaseAdditionProps>
  Copy: ReactFC<CommonProps>
  Remove: ReactFC<CommonProps>
  MoveUp: ReactFC<CommonProps>
  MoveDown: React.FC<React.PropsWithChildren<CommonProps>>
  SortHandle: ReactFC<CommonProps>
  Index: React.FC
  useArray: () => IArrayBaseContext | null
  useIndex: (index?: number) => number
  useRecord: (record?: number) => any
}

export interface IArrayBaseProps {
  disabled?: boolean
  onAdd?: (index: number) => void
  onCopy?: (index: number) => void
  onRemove?: (index: number) => void
  onMoveDown?: (index: number) => void
  onMoveUp?: (index: number) => void
}

const ArrayBaseContext = createContext<IArrayBaseContext | null>(null)

const ItemContext = createContext<IArrayBaseItemProps | null>(null)

const takeRecord = (val: any, index?: number) =>
  typeof val === 'function' ? val(index) : val

const useArray = () => {
  return useContext(ArrayBaseContext)
}

const useIndex = (index?: number) => {
  const ctx = useContext(ItemContext)
  return (ctx ? ctx.index : index) || 0
}

const useRecord = (record?: number) => {
  const ctx = useContext(ItemContext)
  return takeRecord(ctx ? ctx.record : record, ctx?.index)
}

const getSchemaDefaultValue = (schema?: Schema) => {
  if (schema?.type === 'array') return []
  if (schema?.type === 'object') return {}
  if (schema?.type === 'void') {
    for (let key in schema.properties) {
      const value = getSchemaDefaultValue(schema.properties[key])
      if (isValid(value)) return value
    }
  }
}

const getDefaultValue = (defaultValue: any, schema: Schema) => {
  if (isValid(defaultValue)) return clone(defaultValue)
  if (Array.isArray(schema?.items))
    return getSchemaDefaultValue(schema?.items[0])
  return getSchemaDefaultValue(schema?.items)
}

const InternalArrayBase: ReactFC<IArrayBaseProps> = (props) => {
  const field = useField<ArrayField>()
  const schema = useFieldSchema()
  return (
    <RecordsScope getRecords={() => field.value}>
      <ArrayBaseContext.Provider value={{ field, schema, props }}>
        {props.children}
      </ArrayBaseContext.Provider>
    </RecordsScope>
  )
}

const Item: ReactFC<IArrayBaseItemProps> = ({ children, ...props }) => {
  return (
    <ItemContext.Provider value={props}>
      <RecordScope
        getIndex={() => props.index}
        getRecord={() => takeRecord(props.record, props.index)}
      >
        {children}
      </RecordScope>
    </ItemContext.Provider>
  )
}
export const SortableItemContext = createContext<
  Partial<ReturnType<typeof useSortable>>
>({})

const useSortableItem = () => {
  return useContext(SortableItemContext)
}

const InternalSortHandle: ReactFC<CommonProps> = (props: any) => {
  const prefixCls = usePrefixCls('formily-array-base')
  const [wrapSSR, hashId] = useStyle(prefixCls)
  const { attributes, listeners } = useSortableItem()
  return wrapSSR(
    <MenuOutlined
      {...props}
      {...attributes}
      {...listeners}
      className={cls(`${prefixCls}-sort-handle`, hashId, props.className)}
      style={{ ...props.style }}
    />
  )
}

interface ISortItemProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number
}

const SortHandle: ReactFC<CommonProps> = (props) => {
  const array = useArray()
  if (!array) return null
  if (array.field?.pattern !== 'editable') return null
  return <InternalSortHandle {...props} />
}

const SortItem: ReactFC<ISortItemProps> = (props) => {
  const prefixCls = usePrefixCls('formily-array-base')
  const [wrapSSR, hashId] = useStyle(prefixCls)
  const sortable = useSortable({
    id: props.index as number,
  })
  const { setNodeRef, transform } = sortable

  const style = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
  }
  return wrapSSR(
    <SortableItemContext.Provider value={sortable}>
      <div
        {...props}
        ref={setNodeRef}
        style={style}
        className={cls(`${prefixCls}-sort-item`, hashId, props.className)}
      >
        {props.children}
      </div>
    </SortableItemContext.Provider>
  )
}

const Index: React.FC<React.HTMLAttributes<HTMLSpanElement>> = (props) => {
  const index = useIndex()
  const prefixCls = usePrefixCls('formily-array-base')
  const [wrapSSR, hashId] = useStyle(prefixCls)
  return wrapSSR(
    <span {...props} className={cls(`${prefixCls}-index`, hashId)}>
      #{(index || 0) + 1}.
    </span>
  )
}

const Addition: ReactFC<IArrayBaseAdditionProps> = (props) => {
  const self = useField()
  const array = useArray()
  const prefixCls = usePrefixCls('formily-array-base')
  const [wrapSSR, hashId] = useStyle(prefixCls)
  if (!array) return null
  if (
    array.field?.pattern !== 'editable' &&
    array.field?.pattern !== 'disabled'
  )
    return null
  return wrapSSR(
    <Button
      type="dashed"
      block
      {...props}
      disabled={self?.disabled}
      className={cls(`${prefixCls}-addition`, hashId, props.className)}
      onClick={(e) => {
        if (array.props?.disabled) return
        const defaultValue = getDefaultValue(props.defaultValue, array.schema)
        if (props.method === 'unshift') {
          array.field?.unshift?.(defaultValue)
          array.props?.onAdd?.(0)
        } else {
          array.field?.push?.(defaultValue)
          array.props?.onAdd?.(array?.field?.value?.length - 1)
        }
        if (props.onClick) {
          props.onClick(e)
        }
      }}
      icon={<PlusOutlined />}
    >
      {props.title || self.title}
    </Button>
  )
}

const Copy = forwardRef<HTMLSpanElement, CommonProps>((props, ref) => {
  const self = useField()
  const array = useArray()
  const index = useIndex(props.index) || 0
  const prefixCls = usePrefixCls('formily-array-base')
  const [wrapSSR, hashId] = useStyle(prefixCls)
  if (!array) return null
  if (array.field?.pattern !== 'editable') return null
  return wrapSSR(
    <CopyOutlined
      {...props}
      className={cls(
        `${prefixCls}-copy`,
        hashId,
        self?.disabled ? `${prefixCls}-copy-disabled` : '',
        props.className
      )}
      ref={ref}
      onClick={(e) => {
        if (self?.disabled) return
        e.stopPropagation()
        if (array.props?.disabled) return
        const value = clone(array?.field?.value[index])
        const distIndex = index + 1
        array.field?.insert?.(distIndex, value)
        array.props?.onCopy?.(distIndex)
        if (props.onClick) {
          props.onClick(e)
        }
      }}
    />
  )
})

const Remove = forwardRef<HTMLSpanElement, CommonProps>((props, ref) => {
  const index = useIndex(props.index) || 0
  const self = useField()
  const array = useArray()
  const prefixCls = usePrefixCls('formily-array-base')
  const [wrapSSR, hashId] = useStyle(prefixCls)
  if (!array) return null
  if (array.field?.pattern !== 'editable') return null
  return wrapSSR(
    <DeleteOutlined
      {...props}
      className={cls(
        `${prefixCls}-remove`,
        hashId,
        self?.disabled ? `${prefixCls}-remove-disabled` : '',
        props.className
      )}
      ref={ref}
      onClick={(e) => {
        if (self?.disabled) return
        e.stopPropagation()
        array.field?.remove?.(index)
        array.props?.onRemove?.(index)
        if (props.onClick) {
          props.onClick(e)
        }
      }}
    />
  )
})

const MoveDown = forwardRef<HTMLSpanElement, CommonProps>((props, ref) => {
  const index = useIndex(props.index) || 0
  const self = useField()
  const array = useArray()
  const prefixCls = usePrefixCls('formily-array-base')
  const [wrapSSR, hashId] = useStyle(prefixCls)
  if (!array) return null
  if (array.field?.pattern !== 'editable') return null
  return wrapSSR(
    <DownOutlined
      {...props}
      className={cls(
        `${prefixCls}-move-down`,
        hashId,
        self?.disabled ? `${prefixCls}-move-down-disabled` : '',
        props.className
      )}
      ref={ref}
      onClick={(e) => {
        if (self?.disabled) return
        e.stopPropagation()
        array.field?.moveDown?.(index)
        array.props?.onMoveDown?.(index)
        if (props.onClick) {
          props.onClick(e)
        }
      }}
    />
  )
})

const MoveUp = forwardRef<HTMLSpanElement, CommonProps>((props, ref) => {
  const index = useIndex(props.index)
  const self = useField()
  const array = useArray()
  const prefixCls = usePrefixCls('formily-array-base')
  const [wrapSSR, hashId] = useStyle(prefixCls)
  if (!array) return null
  if (array.field?.pattern !== 'editable') return null
  return wrapSSR(
    <UpOutlined
      {...props}
      className={cls(
        `${prefixCls}-move-up`,
        hashId,
        self?.disabled ? `${prefixCls}-move-up-disabled` : '',
        props.className
      )}
      ref={ref}
      onClick={(e) => {
        if (self?.disabled) return
        e.stopPropagation()
        array?.field?.moveUp(index)
        array?.props?.onMoveUp?.(index)
        if (props.onClick) {
          props.onClick(e)
        }
      }}
    />
  )
})

function mixin<T extends object = object>(target: T): T & ArrayBaseMixins {
  return Object.assign(target, {
    Index,
    SortHandle,
    SortItem,
    Addition,
    Copy,
    Remove,
    MoveDown,
    MoveUp,
    useArray,
    useIndex,
    useRecord,
  })
}

export const ArrayBase = Object.assign(InternalArrayBase, {
  Item,
  Index,
  SortHandle,
  SortItem,
  Addition,
  Copy,
  Remove,
  MoveDown,
  MoveUp,
  useArray,
  useIndex,
  useRecord,
  mixin,
})

export default ArrayBase

type NumConst = (v: any) => any;
type DVGetter = (byteOffset: number, littleEndian?: boolean) => any;
type DVSetter = (byteOffset: number, value: any, littleEndian?: boolean) => void;

const base_types = {
  'u8': [1, Number as NumConst, DataView.prototype.getUint8 as DVGetter, DataView.prototype.setUint8 as DVSetter],
  'u16': [2, Number as NumConst, DataView.prototype.getUint16 as DVGetter, DataView.prototype.setUint16 as DVSetter],
  'u32': [4, Number as NumConst, DataView.prototype.getUint32 as DVGetter, DataView.prototype.setUint32 as DVSetter],
  'u64': [8, BigInt as NumConst, DataView.prototype.getBigUint64 as DVGetter, DataView.prototype.setBigUint64 as DVSetter],
  's8': [1, Number as NumConst, DataView.prototype.getInt8 as DVGetter, DataView.prototype.setInt8 as DVSetter],
  's16': [2, Number as NumConst, DataView.prototype.getInt16 as DVGetter, DataView.prototype.setInt16 as DVSetter],
  's32': [4, Number as NumConst, DataView.prototype.getInt32 as DVGetter, DataView.prototype.setInt32 as DVSetter],
  's64': [8, BigInt as NumConst, DataView.prototype.getBigInt64 as DVGetter, DataView.prototype.setBigInt64 as DVSetter],
  'f32': [4, Number as NumConst, DataView.prototype.getFloat32 as DVGetter, DataView.prototype.setFloat32 as DVSetter],
  'f64': [8, Number as NumConst, DataView.prototype.getFloat64 as DVGetter, DataView.prototype.setFloat64 as DVSetter],
};

/** you can add custom types to read/write (TS typesystem cannot dettect them) */
export const field_types_data = {
  ...base_types,

  'bool': base_types['u8'],
  'boolean': base_types['u8'],
  'char': base_types['u8'],
  'byte': base_types['u8'],
  'uchar': base_types['u8'],
  'ubyte': base_types['u8'],

  'i8': base_types['s8'],

  'size16': base_types['u16'],
  'ptr16': base_types['u16'],

  'i16': base_types['s16'],

  'ptr32': base_types['u32'],
  'size32': base_types['u32'],

  'i32': base_types['s32'],

  'ptr64': base_types['u64'],
  'size64': base_types['u64'],
  'ptr': base_types['u64'],
  'size': base_types['u64'],
  'str': base_types['u64'],
  'string': base_types['u64'],

  'i64': base_types['s64'],

  'float': base_types['f32'],
  'float32': base_types['f32'],
  'float64': base_types['f64'],
  'double': base_types['f64'],
};

type SingleFieldType = keyof typeof field_types_data;
type ArrayFieldType = [type: SingleFieldType, count: number];
export type FieldType = SingleFieldType | ArrayFieldType;

type TypeOfField<T extends FieldType> =
  T extends [FieldType, 1] ? TypeOfField<T[0]> :
  T extends [FieldType, number] ? (TypeOfField<T[0]>)[] :
  bigint|number|string|boolean;

type MapSchema = Record<string, FieldType>;
type ArraySchema = [fieldname: string, type: FieldType][];
export type Schema = MapSchema; // | ArraySchema;

type ToMapSchema<T extends Schema> = 
  T extends MapSchema ? T :
  // T extends ArraySchema ? { [K in T[number] as K[0]]: K[1] } :
  never;
/*type ToArraySchema<T extends Schema> = 
  T extends ArraySchema ? T :
  T extends MapSchema ? undefined:
  never;*/

type FieldNames<S extends Schema> =
  S extends MapSchema ? string & keyof S :
  // S extends ArraySchema ? FieldNames<ToMapSchema<S>>:
  never;

export type RecordOfSchema<S extends Schema> =
  S extends MapSchema ? { [K in keyof S]: TypeOfField<S[K]> } :
  // S extends ArraySchema ? RecordOfSchema<ToMapSchema<S>>:
  never;

export const getFieldTypeData = (type: FieldType) => {
  return field_types_data[(typeof type === 'string' ? type : type[0]) as SingleFieldType];
}
  
export const getFieldTypeSize = (type: FieldType): number => {
  if (typeof type === 'string')
    return field_types_data[type as SingleFieldType][0] as number; 
  return field_types_data[type[0] as SingleFieldType][0] as number * type[1];
}
    
export class Strukt<S extends Schema> {
  private readonly innerschema: Map<string, FieldType> = new Map<string, FieldType>();

  constructor(
    public readonly name: string,
    schema: S|ArraySchema|Map<string, FieldType|[FieldType, number]>,
  ) {
    // NOTE: Map always preservers set order:
    // see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#objects_vs._maps
    // I test deno and chrome current impelemention of Object and they keep property insertion order
    // but if in some cases simple object (dict) does not work, you can use Map
    for(let [k,v] of (Array.isArray(schema) ? schema : Object.entries(schema)))
      this.innerschema.set(k, v);
  }

  get schema(): ToMapSchema<S> {
    return {...this.innerschema.entries()} as any;
  }

  get size(): number {
    return [...this.innerschema.entries()]
      .reduce((acc, [, type]) => acc + getFieldTypeSize(type), 0);
  }

  typeOf(fieldName: FieldNames<S>): FieldType|[FieldType, number] {
    if(!this.innerschema.has(fieldName))
      return console.assert(false, 'field not found'), undefined as any;
    return this.innerschema.get(fieldName)!;
  }

  sizeOf(fieldName: FieldNames<S>): number {
    if(!this.innerschema.has(fieldName))
      return console.assert(false, 'field not found'), undefined as any;
    return getFieldTypeSize(this.innerschema.get(fieldName)!);
  }

  offsetOf(fieldName: FieldNames<S>): number {
    if(!this.innerschema.has(fieldName))
      return console.assert(false, 'field not found'), undefined as any;
    return console.assert(false, 'not implemented'), 0;
  }

  write(record: RecordOfSchema<S>, littleEndian?:boolean): ArrayBuffer {
    return this.writeTo(new ArrayBuffer(this.size), record, 0, littleEndian);
  }

  writeTo(buf: ArrayBuffer, record: RecordOfSchema<S>, offset=0, littleEndian?:boolean): ArrayBuffer {
    const view = new DataView(buf);
    for(let [name, type] of this.innerschema.entries()) {
      const isArray = typeof type !== 'string' && type[1] > 1;
      const count = isArray?type[1]:1;
      const [size, num, _, setter] = getFieldTypeData(type) as [number, NumConst, DVGetter, DVSetter];
      const data = (isArray?record[name as FieldNames<S>]:[record[name as FieldNames<S>]]) as any[];
      for(let i=0; i<count; ++i) {
        setter.call(view, offset, num(data[i]), littleEndian);
        offset += size;
      }
    }
    return buf;
  }

  readFrom(buf: ArrayBuffer, offset=0, count=null, littleEndian?:boolean): RecordOfSchema<S> /*| RecordOfSchema<S>[]*/ {
    const view = new DataView(buf);
    const result: any[] = [];
    for(let c=0; c<(count??1); ++c) {
      const record: RecordOfSchema<S> = {} as any;
      for(let [name, type] of this.innerschema.entries()) {
        const isArray = typeof type !== 'string' && type[1] > 1;
        const count = isArray?type[1]:1;
        const [size, num, getter, _] = getFieldTypeData(type) as [number, NumConst, DVGetter, DVSetter];
        
        const data = [];
        for(let i=0; i<count; ++i) {
          data.push(num(getter.call(view, offset, littleEndian)));
          offset += size;
        }

        record[name as FieldNames<S>] = isArray ? data : data[0];
      }
      result.push(record);
    }
    return count==null?result[0]:result; 
  }
}

export type SchemaOf<S extends Strukt<any>> =
  S extends Strukt<infer X> ? X : never;

export type RecordOf<S extends Strukt<any>> =
  RecordOfSchema<SchemaOf<S>>;

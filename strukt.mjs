const base_types = {
    'u8': [1, Number, DataView.prototype.getUint8, DataView.prototype.setUint8],
    'u16': [2, Number, DataView.prototype.getUint16, DataView.prototype.setUint16],
    'u32': [4, Number, DataView.prototype.getUint32, DataView.prototype.setUint32],
    'u64': [8, BigInt, DataView.prototype.getBigUint64, DataView.prototype.setBigUint64],
    's8': [1, Number, DataView.prototype.getInt8, DataView.prototype.setInt8],
    's16': [2, Number, DataView.prototype.getInt16, DataView.prototype.setInt16],
    's32': [4, Number, DataView.prototype.getInt32, DataView.prototype.setInt32],
    's64': [8, BigInt, DataView.prototype.getBigInt64, DataView.prototype.setBigInt64],
    'f32': [4, Number, DataView.prototype.getFloat32, DataView.prototype.setFloat32],
    'f64': [8, Number, DataView.prototype.getFloat64, DataView.prototype.setFloat64],
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
export const getFieldTypeData = (type) => {
    return field_types_data[(typeof type === 'string' ? type : type[0])];
};
export const getFieldTypeSize = (type) => {
    if (typeof type === 'string')
        return field_types_data[type][0];
    return field_types_data[type[0]][0] * type[1];
};
export class Strukt {
    constructor(name, schema) {
        this.name = name;
        this.innerschema = new Map();
        // NOTE: Map always preservers set order:
        // see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#objects_vs._maps
        // I test deno and chrome current impelemention of Object and they keep property insertion order
        // but if in some cases simple object (dict) does not work, you can use Map
        for (let [k, v] of (Array.isArray(schema) ? schema : Object.entries(schema)))
            this.innerschema.set(k, v);
    }
    get schema() {
        return { ...this.innerschema.entries() };
    }
    get size() {
        return [...this.innerschema.entries()]
            .reduce((acc, [, type]) => acc + getFieldTypeSize(type), 0);
    }
    typeOf(fieldName) {
        if (!this.innerschema.has(fieldName))
            return console.assert(false, 'field not found'), undefined;
        return this.innerschema.get(fieldName);
    }
    sizeOf(fieldName) {
        if (!this.innerschema.has(fieldName))
            return console.assert(false, 'field not found'), undefined;
        return getFieldTypeSize(this.innerschema.get(fieldName));
    }
    offsetOf(fieldName) {
        if (!this.innerschema.has(fieldName))
            return console.assert(false, 'field not found'), undefined;
        return console.assert(false, 'not implemented'), 0;
    }
    write(record, littleEndian) {
        return this.writeTo(new ArrayBuffer(this.size), record, 0, littleEndian);
    }
    writeTo(buf, record, offset = 0, littleEndian) {
        const view = new DataView(buf);
        for (let [name, type] of this.innerschema.entries()) {
            const isArray = typeof type !== 'string' && type[1] > 1;
            const count = isArray ? type[1] : 1;
            const [size, num, _, setter] = getFieldTypeData(type);
            const data = (isArray ? record[name] : [record[name]]);
            for (let i = 0; i < count; ++i) {
                setter.call(view, offset, num(data[i]), littleEndian);
                offset += size;
            }
        }
        return buf;
    }
    readFrom(buf, offset = 0, count = null, littleEndian) {
        const view = new DataView(buf);
        const result = [];
        for (let c = 0; c < (count ?? 1); ++c) {
            const record = {};
            for (let [name, type] of this.innerschema.entries()) {
                const isArray = typeof type !== 'string' && type[1] > 1;
                const count = isArray ? type[1] : 1;
                const [size, num, getter, _] = getFieldTypeData(type);
                const data = [];
                for (let i = 0; i < count; ++i) {
                    data.push(num(getter.call(view, offset, littleEndian)));
                    offset += size;
                }
                record[name] = isArray ? data : data[0];
            }
            result.push(record);
        }
        return count == null ? result[0] : result;
    }
}

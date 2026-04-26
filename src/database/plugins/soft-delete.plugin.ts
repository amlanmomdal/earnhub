import { Query, Schema } from 'mongoose';

export function softDeletePlugin(schema: Schema) {
  const excludeDeleted = function (this: Query<unknown, unknown>) {
    const query = this.getQuery() as { isDeleted?: boolean };
    if (query.isDeleted === undefined) {
      this.where({ isDeleted: false });
    }
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
}

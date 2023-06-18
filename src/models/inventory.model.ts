import { Table, Column, Model, CreatedAt, UpdatedAt, DataType } from 'sequelize-typescript';

@Table({ modelName: 'Inventory', tableName: 'inventory' })
class Inventory extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' })
  id!: number;

  @Column({ type: DataType.UUID, field: 'product_id', allowNull: false })
  productId!: string;

  @Column({ type: DataType.INTEGER, field: 'quantity', allowNull: false })
  quantity!: number;

  @Column({ type: DataType.STRING, field: 'name', allowNull: false })
  name!: string;

  @Column({ type: DataType.INTEGER, field: 'price', allowNull: false })
  price!: number;

  @Column({ type: DataType.TEXT, field: 'desc', allowNull: true })
  desc!: string;

  @Column({ type: DataType.INTEGER, field: 'status', allowNull: false })
  status!: number;

  @Column({ type: DataType.INTEGER, field: 'revision', allowNull: false })
  revision!: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'last_updated', allowNull: false })
  lastUpdated!: Date;
}

export default Inventory;

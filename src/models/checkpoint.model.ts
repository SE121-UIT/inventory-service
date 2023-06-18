import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ modelName: 'Checkpoint', tableName: 'checkpoint', timestamps: false })
class Checkpoint extends Model {
  @Column({ type: DataType.STRING, primaryKey: true, field: 'id' })
  id!: string;

  @Column({ type: DataType.TEXT, field: 'position', allowNull: false })
  position!: string;
}

export default Checkpoint;

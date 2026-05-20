import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminId: string;

  @Column()
  action: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column()
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}

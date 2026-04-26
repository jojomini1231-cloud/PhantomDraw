import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  accessToken: string;

  @Column({ default: 'Free' })
  type: string; // Free, Plus, Team, Pro

  @Column({ default: '正常' })
  status: string; // 正常, 异常, 限流, 禁用

  @Column({ default: 0 })
  quota: number;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  userId: string;

  @Column('simple-json', { default: '[]' })
  limitsProgress: any[];

  @Column({ nullable: true })
  defaultModelSlug: string;

  @Column({ nullable: true })
  restoreAt: string;

  @Column({ default: 0 })
  success: number;

  @Column({ default: 0 })
  fail: number;

  @Column({ nullable: true })
  lastUsedAt: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

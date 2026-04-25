import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class GalleryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, default: 'Untitled' })
  title: string;

  @Column({ type: 'text', default: '' })
  promptZh: string;

  @Column({ type: 'text', default: '' })
  promptEn: string;

  @Column({ default: '人物' })
  category: string;

  @Column({ default: 'free' }) // 'free' | 'paid'
  type: string;

  @Column({ default: 0 })
  unlockQuota: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

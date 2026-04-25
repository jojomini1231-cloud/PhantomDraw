import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { GalleryItem } from './gallery-item.entity';

@Entity()
@Unique(['apiKeyId', 'galleryItemId'])
export class GalleryUnlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  apiKeyId: string;

  @Column()
  galleryItemId: string;

  @ManyToOne(() => ApiKey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKey;

  @ManyToOne(() => GalleryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'galleryItemId' })
  galleryItem: GalleryItem;

  @Column({ default: 0 })
  cost: number;

  @CreateDateColumn()
  createdAt: Date;
}

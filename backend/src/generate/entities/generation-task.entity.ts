import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ApiKey } from '../../auth/entities/api-key.entity';

@Entity()
export class GenerationTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // 'txt2img' | 'img2img'

  @Column()
  status: string; // 'pending' | 'running' | 'success' | 'failed'

  @Column('text')
  prompt: string;

  @Column('text', { nullable: true })
  negativePrompt: string;

  @Column('text', { nullable: true })
  initImage: string;

  @Column({ default: 'gpt-image-2' })
  model: string;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  storageKey: string;

  @Column({ nullable: true })
  errorReason: string;

  @Column({ nullable: true })
  providerName: string;

  @ManyToOne(() => ApiKey)
  apiKey: ApiKey;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

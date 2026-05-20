import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  getConfig,
  getRequirementsToken,
  getAnswerToken,
} from './proof-of-work.util';
import * as crypto from 'crypto';

@Injectable()
export class ChatgptService implements OnModuleInit {
  private readonly logger = new Logger(ChatgptService.name);
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  private readonly baseUrl = 'https://chatgpt.com';
  private gotScraping: (
    options: Record<string, unknown>,
  ) => Promise<{ body: unknown }>;

  async onModuleInit() {
    const module = await (eval('import("got-scraping")') as Promise<{
      gotScraping: (
        options: Record<string, unknown>,
      ) => Promise<{ body: unknown }>;
    }>);
    this.gotScraping = module.gotScraping;
  }

  private async getChatRequirements(accessToken: string, deviceId: string) {
    const config = getConfig(this.userAgent);
    const reqToken = getRequirementsToken(config);

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'oai-device-id': deviceId,
      'oai-language': 'zh-CN',
      'user-agent': this.userAgent,
    };

    const res = await this.gotScraping({
      url: `${this.baseUrl}/backend-api/sentinel/chat-requirements`,
      method: 'POST',
      headers,
      json: { p: reqToken },
    });

    const data = res.body as {
      token: string;
      turnstile?: { required: boolean; dx: string };
    };

    let proofToken: string | null = null;
    if (data.turnstile?.required) {
      const { dx } = data.turnstile;
      const token = data.token;
      const answerRes = getAnswerToken(token, dx, config);
      proofToken = answerRes.token;
    }

    return {
      chatToken: data.token,
      proofToken,
    };
  }

  async generateImage(
    accessToken: string,
    prompt: string,
    model: string = 'auto',
  ) {
    const deviceId = crypto.randomUUID();
    const { chatToken, proofToken } = await this.getChatRequirements(
      accessToken,
      deviceId,
    );

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      accept: 'text/event-stream',
      'content-type': 'application/json',
      'oai-device-id': deviceId,
      'oai-language': 'zh-CN',
      'user-agent': this.userAgent,
      'openai-sentinel-chat-requirements-token': chatToken,
    };
    if (proofToken) {
      headers['openai-sentinel-proof-token'] = proofToken;
    }

    const body = {
      action: 'next',
      messages: [
        {
          id: crypto.randomUUID(),
          author: { role: 'user' },
          content: { content_type: 'text', parts: [prompt] },
          metadata: {},
        },
      ],
      parent_message_id: crypto.randomUUID(),
      model: model,
      timezone_offset_min: -480,
      history_and_training_disabled: false,
      conversation_mode: { kind: 'primary_assistant' },
      force_paragen: false,
      force_paragen_model_slug: '',
      force_nulligen: false,
      force_rate_limit: false,
      system_hints: ['picture_v2'],
    };

    const res = await this.gotScraping({
      url: `${this.baseUrl}/backend-api/conversation`,
      method: 'POST',
      headers,
      json: body,
    });

    const text = res.body as string;
    const fileIdMatch = text.match(/"file_id":\s*"([^"]+)"/);
    if (!fileIdMatch) {
      console.log(
        'Raw response text that failed to match file_id:',
        text.substring(0, 1000) + '...',
      );
      throw new Error('Could not find file_id in response');
    }
    const fileId = fileIdMatch[1];

    const dlRes = await this.gotScraping({
      url: `${this.baseUrl}/backend-api/files/${fileId}/download`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'user-agent': this.userAgent,
      },
    });
    const dlData = dlRes.body as { download_url: string };
    return dlData.download_url;
  }

  async uploadImage(
    accessToken: string,
    imageInput: string,
  ): Promise<{ fileId: string; sizeBytes: number }> {
    const { buffer, mimeType } = await this.loadImageInput(imageInput);

    const formData = new FormData();
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: mimeType });
    formData.append('file', blob, 'image.png');
    formData.append('purpose', 'vision');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'user-agent': this.userAgent,
    };

    const res = await this.gotScraping({
      url: `${this.baseUrl}/backend-api/files`,
      method: 'POST',
      headers,
      body: formData,
    });

    const data = res.body as { file_id: string };
    return {
      fileId: data.file_id,
      sizeBytes: buffer.length,
    };
  }

  async editImage(
    accessToken: string,
    prompt: string,
    imageBase64: string,
    model: string = 'auto',
  ) {
    const { fileId, sizeBytes } = await this.uploadImage(
      accessToken,
      imageBase64,
    );

    const deviceId = crypto.randomUUID();
    const { chatToken, proofToken } = await this.getChatRequirements(
      accessToken,
      deviceId,
    );

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      accept: 'text/event-stream',
      'content-type': 'application/json',
      'oai-device-id': deviceId,
      'oai-language': 'zh-CN',
      'user-agent': this.userAgent,
      'openai-sentinel-chat-requirements-token': chatToken,
    };
    if (proofToken) {
      headers['openai-sentinel-proof-token'] = proofToken;
    }

    const body = {
      action: 'next',
      messages: [
        {
          id: crypto.randomUUID(),
          author: { role: 'user' },
          content: {
            content_type: 'multimodal_text',
            parts: [
              {
                asset_pointer: `file-service://${fileId}`,
                size_bytes: sizeBytes,
                width: 1024,
                height: 1024,
              },
              prompt,
            ],
          },
          metadata: {},
        },
      ],
      parent_message_id: crypto.randomUUID(),
      model: model,
      timezone_offset_min: -480,
      history_and_training_disabled: false,
      conversation_mode: { kind: 'primary_assistant' },
      system_hints: ['picture_v2'],
    };

    const res = await this.gotScraping({
      url: `${this.baseUrl}/backend-api/conversation`,
      method: 'POST',
      headers,
      json: body,
    });

    const text = res.body as string;
    // In edit mode, it also returns a file_id for the generated image
    const fileIdMatch = text.match(/"file_id":\s*"([^"]+)"/g);
    if (!fileIdMatch) {
      console.log(
        'Raw response text that failed to match file_id in editImage:',
        text.substring(0, 1000) + '...',
      );
      throw new Error('Could not find generated file_id in response');
    }

    // We want the LAST file_id which is the generated image, the first might be the uploaded one
    const lastMatch = fileIdMatch[fileIdMatch.length - 1];
    const generatedFileIdMatch = lastMatch.match(/"file_id":\s*"([^"]+)"/);
    if (!generatedFileIdMatch) {
      throw new Error('Could not extract generated file_id');
    }
    const generatedFileId = generatedFileIdMatch[1];

    const outRes = await this.gotScraping({
      url: `${this.baseUrl}/backend-api/files/${generatedFileId}/download`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'user-agent': this.userAgent,
      },
    });
    const outData = outRes.body as { download_url: string };
    return outData.download_url;
  }

  private async loadImageInput(
    imageInput: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    if (/^https?:\/\//i.test(imageInput)) {
      const response = await fetch(imageInput);
      if (!response.ok) {
        throw new Error(`Failed to fetch reference image: ${response.status}`);
      }

      const mimeType =
        response.headers.get('content-type')?.split(';')[0] || 'image/png';
      const arrayBuffer = await response.arrayBuffer();

      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType,
      };
    }

    const dataUrlMatch = imageInput.match(/^data:(image\/[\w.+-]+);base64,/);
    const mimeType = dataUrlMatch?.[1] || 'image/png';
    const base64Data = imageInput.replace(/^data:image\/[\w.+-]+;base64,/, '');

    return {
      buffer: Buffer.from(base64Data, 'base64'),
      mimeType,
    };
  }
}

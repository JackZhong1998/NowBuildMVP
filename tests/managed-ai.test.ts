import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const gateway = readFileSync(resolve(process.cwd(), 'src/lib/nowbuild/managed-ai.ts'), 'utf8');
const environment = readFileSync(resolve(process.cwd(), 'src/lib/nowbuild/environment-schema.ts'), 'utf8');
const proxy = readFileSync(resolve(process.cwd(), 'src/app/p/[projectId]/[[...path]]/route.ts'), 'utf8');

describe('NowBuild managed AI', () => {
  it('keeps the platform key behind an authenticated metered gateway', () => {
    expect(gateway).toContain('getNowBuildUserId');
    expect(gateway).toContain('getProjectSession');
    expect(gateway).toContain('chargeCredits');
    expect(gateway).toContain("data_collection: 'deny'");
    expect(proxy).toContain('handleManagedAIRequest(request, projectId)');
  });

  it('never asks a generated project for the platform OpenRouter key', () => {
    expect(environment).not.toContain("key: 'OPENROUTER_API_KEY'");
    expect(environment).toContain("'OPENROUTER_API_KEY'");
    expect(environment).toContain('NowBuild 托管');
  });

  it('registers real modalities and marks unsupported adapters honestly', () => {
    for (const capability of ['text', 'image', 'video', 'speech', 'transcription']) {
      expect(gateway).toContain(`id: '${capability}'`);
    }
    expect(gateway).toContain("id: 'music', name: '音乐生成', status: 'coming_soon'");
    expect(gateway).toContain("id: '3d', name: '3D 生成', status: 'coming_soon'");
  });

  it('uses platform model routing and does not accept a browser model slug', () => {
    for (const variable of ['NOWBUILD_AI_TEXT_MODEL', 'NOWBUILD_AI_IMAGE_MODEL', 'NOWBUILD_AI_VIDEO_MODEL', 'NOWBUILD_AI_SPEECH_MODEL', 'NOWBUILD_AI_TRANSCRIPTION_MODEL']) {
      expect(gateway).toContain(variable);
    }
    expect(gateway).not.toContain('model?: string');
    expect(gateway).toContain("text: 'deepseek/deepseek-v4-flash'");
    expect(gateway).toContain("video: 'bytedance/seedance-2.0-fast'");
    expect(gateway).toContain(": '2K'");
    expect(gateway).toContain("model.includes('seedream-4.5')");
  });
});

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';

import { Text, type TextVariant } from './Text';

const meta = {
  title: 'Shared/Design System/Text',
  component: Text,
  parameters: { layout: 'centered' },
  args: {
    variant: 'body',
    children: 'Текст поддерживает <strong>HTML-разметку</strong> внутри children.'
  }
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

const variants: Array<{ variant: TextVariant; label: string; sample: string }> = [
  { variant: 'display', label: 'Display', sample: 'Крупный экранный заголовок' },
  { variant: 'title', label: 'Title', sample: 'Заголовок секции' },
  { variant: 'subtitle', label: 'Subtitle', sample: 'Пояснение к важному блоку интерфейса' },
  {
    variant: 'body',
    label: 'Body',
    sample: 'Основной текст с <strong>акцентом</strong> и <a href="#details">ссылкой</a>.'
  },
  { variant: 'bodyStrong', label: 'Body strong', sample: 'Короткое значимое утверждение.' },
  { variant: 'caption', label: 'Caption', sample: 'Вспомогательная подпись или метаданные.' },
  { variant: 'code', label: 'Code', sample: 'npm run typecheck\nconst value = "safe";' },
  { variant: 'quote', label: 'Quote', sample: 'Цитата или системная подсказка с мягким визуальным акцентом.' },
  { variant: 'danger', label: 'Danger', sample: 'Ошибка: действие требует внимания пользователя.' }
];

const rotatingMessages = [
  'Агент читает <strong>контекст проекта</strong>.',
  'Агент нашёл <em>новые файлы</em> и обновляет план.',
  'Готово: можно проверить <a href="#storybook-result">результат</a>.'
];

/**
 * Небольшой story-only компонент нужен, чтобы показать реальную смену children: именно на таком сценарии
 * Text держит предыдущую HTML-разметку и анимирует исчезновение/появление нового текста.
 */
function AnimatedContentDemo() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessageIndex((currentIndex) => (currentIndex + 1) % rotatingMessages.length);
    }, 1800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <Text as="div" variant="title" animateContentChanges>
      {rotatingMessages[messageIndex]}
    </Text>
  );
}

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, width: 520 }}>
      {variants.map(({ variant, label, sample }) => (
        <div key={variant} style={{ display: 'grid', gap: 4 }}>
          <Text variant="caption">{label}</Text>
          <Text variant={variant}>{sample}</Text>
        </div>
      ))}
    </div>
  )
};

export const GradientAnimation: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 520 }}>
      <Text variant="caption">animatedGradient</Text>
      <Text as="div" variant="display" animatedGradient>
        Переливающийся <strong>градиент</strong>
      </Text>
      <Text as="div" variant="body" animatedGradient>
        Основной цвет текста плавно уходит в прозрачность и возвращается без дополнительных цветовых токенов.
      </Text>
      <Text as="div" variant="body" animatedGradient>
        Длинный текст переносится на несколько строк, но градиент остаётся синхронным для всего блока. Несколько мягких
        затемнений внутри одного медленного линейного движения создают спокойную задумчивую пульсацию без рывков и без
        резкого эффекта сканера.
      </Text>
    </div>
  )
};

export const ContentChangeAnimation: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 520 }}>
      <Text variant="caption">animateContentChanges</Text>
      <AnimatedContentDemo />
      <Text variant="body">
        Сообщение меняется каждые 1.8 секунды: старая версия плавно исчезает, новая появляется с мягким blur.
      </Text>
    </div>
  )
};

export const CombinedAnimations: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 520 }}>
      <Text variant="caption">animatedGradient + animateContentChanges</Text>
      <Text as="div" variant="title" animatedGradient animateContentChanges>
        {'Компонент может одновременно <strong>переливаться</strong> и анимировать первое появление.'}
      </Text>
    </div>
  )
};

export const SafeHtml: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 520 }}>
      <Text variant="title">HTML внутри текста</Text>
      <Text as="div">
        {
          '<style>.storybook-safe-html-demo { color: var(--vscode-textLink-foreground); font-weight: 700; }</style><span class="storybook-safe-html-demo">Этот стиль оставлен</span>, <em>разметка работает</em>, а <script>document.body.innerHTML = "pwned"</script><a href="javascript:alert(1)" onclick="alert(1)">опасный JS вырезан</a>.'
        }
      </Text>
    </div>
  )
};

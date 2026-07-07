import { Fragment, memo, type ReactNode } from 'react';
import { Linking, Text, View } from 'react-native';
import { useMdmaTheme, type MdmaTheme } from '../theme/MdmaThemeProvider.js';

/**
 * Minimal inline-Markdown renderer: maps the mdast nodes that appear between
 * MDMA blocks (headings, paragraphs, lists, code, links, emphasis) to RN
 * primitives. The web renderer gets this from the DOM for free; on native it is
 * a real (if small) scope item. Richer coverage (images, tables, footnotes) can
 * later swap in `react-native-markdown-display` — see the renderer plan, Q4.
 */

// mdast nodes are loosely typed here to avoid a hard dependency on @types/mdast.
interface MdastNode {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  url?: string;
  children?: MdastNode[];
}

export interface MdastRendererProps {
  node: MdastNode;
}

/** Render inline (phrasing) content as nested <Text>. */
function renderInline(node: MdastNode, theme: MdmaTheme, key: number): ReactNode {
  switch (node.type) {
    case 'text':
      return <Fragment key={key}>{node.value}</Fragment>;
    case 'strong':
      return (
        <Text key={key} style={{ fontWeight: '700' }}>
          {node.children?.map((c, i) => renderInline(c, theme, i))}
        </Text>
      );
    case 'emphasis':
      return (
        <Text key={key} style={{ fontStyle: 'italic' }}>
          {node.children?.map((c, i) => renderInline(c, theme, i))}
        </Text>
      );
    case 'delete':
      return (
        <Text key={key} style={{ textDecorationLine: 'line-through' }}>
          {node.children?.map((c, i) => renderInline(c, theme, i))}
        </Text>
      );
    case 'inlineCode':
      return (
        <Text
          key={key}
          style={{
            fontFamily: 'Courier',
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
          }}
        >
          {node.value}
        </Text>
      );
    case 'link':
      return (
        <Text
          key={key}
          style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
          onPress={node.url ? () => Linking.openURL(node.url as string) : undefined}
        >
          {node.children?.map((c, i) => renderInline(c, theme, i))}
        </Text>
      );
    case 'break':
      return <Fragment key={key}>{'\n'}</Fragment>;
    default:
      if (node.children) {
        return (
          <Fragment key={key}>{node.children.map((c, i) => renderInline(c, theme, i))}</Fragment>
        );
      }
      return node.value ? <Fragment key={key}>{node.value}</Fragment> : null;
  }
}

export const MdastRenderer = memo(function MdastRenderer({ node }: MdastRendererProps) {
  const theme = useMdmaTheme();
  const { spacing, fontSize, colors } = theme;

  switch (node.type) {
    case 'heading': {
      const size = node.depth && node.depth <= 2 ? fontSize.title + 4 : fontSize.title;
      return (
        <Text
          style={{
            fontSize: size,
            fontWeight: '700',
            color: colors.text,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          {node.children?.map((c, i) => renderInline(c, theme, i))}
        </Text>
      );
    }
    case 'paragraph':
      return (
        <Text
          style={{
            fontSize: fontSize.body,
            color: colors.text,
            marginVertical: spacing.xs,
            lineHeight: fontSize.body * 1.5,
          }}
        >
          {node.children?.map((c, i) => renderInline(c, theme, i))}
        </Text>
      );
    case 'list':
      return (
        <View style={{ marginVertical: spacing.xs, paddingLeft: spacing.sm }}>
          {node.children?.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', marginVertical: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.body }}>
                {node.ordered ? `${i + 1}. ` : '• '}
              </Text>
              <Text style={{ color: colors.text, fontSize: fontSize.body, flex: 1 }}>
                {item.children?.flatMap((c) => c.children ?? [c]).map((c, j) => renderInline(c, theme, j))}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'code':
      return (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: theme.radius.sm,
            padding: spacing.sm,
            marginVertical: spacing.xs,
          }}
        >
          <Text style={{ fontFamily: 'Courier', color: colors.text, fontSize: fontSize.small }}>
            {node.value}
          </Text>
        </View>
      );
    case 'thematicBreak':
      return (
        <View
          style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }}
        />
      );
    case 'blockquote':
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: colors.border,
            paddingLeft: spacing.sm,
            marginVertical: spacing.xs,
          }}
        >
          {node.children?.map((c, i) => <MdastRenderer key={i} node={c} />)}
        </View>
      );
    default:
      return null;
  }
});

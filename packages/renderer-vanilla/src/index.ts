export {
  mountMdmaDocument,
  type ComponentEntry,
  type MdmaDocumentHandle,
  type MdmaDocumentOptions,
  type MdmaRenderCustomizations,
} from './document/mount-document.js';
export {
  mountMdmaBlock,
  blockRendererProps,
  type MountBlockOptions,
} from './document/mount-block.js';
export {
  extractIdFromYaml,
  extractTypeFromYaml,
  buildPartialThinkingBlock,
} from './document/partial-yaml.js';
export { renderBlockLoading, extractTypeHint } from './components/MdmaBlockLoading.js';
export { renderMdast, type MdastNode } from './markdown/render-mdast.js';

export {
  stateless,
  withState,
  type MdmaBlockRenderer,
  type MdmaBlockRendererProps,
  type RendererInstance,
} from './renderers/renderer-props.js';
export {
  RendererRegistry,
  createRendererRegistry,
  defaultRenderers,
} from './renderers/renderer-registry.js';

export {
  resolveElementOverride,
  type CustomVariantProps,
  type CustomVariantRenderer,
  type CustomVariants,
  type DataSources,
  type ElementInstance,
  type ElementOverrides,
  type ElementRenderer,
  type RenderContext,
} from './context/render-context.js';

export {
  applyTheme,
  darkTheme,
  lightTheme,
  resolveThemeProps,
  themeToCssVars,
  type MdmaTheme,
  type MdmaThemeInput,
  type ResolvedThemeProps,
} from './theme/theme.js';

export { el, append, clear, setInputValue, type Child, type ElementProps } from './dom/el.js';

export { ApprovalGateRenderer } from './components/ApprovalGateRenderer.js';
export { ButtonRenderer } from './components/ButtonRenderer.js';
export { CalloutRenderer } from './components/CalloutRenderer.js';
export { ChartRenderer } from './components/ChartRenderer.js';
export { CustomRenderer } from './components/CustomRenderer.js';
export { FormRenderer } from './components/FormRenderer.js';
export { TableRenderer } from './components/TableRenderer.js';
export { TasklistRenderer } from './components/TasklistRenderer.js';
export { ThinkingRenderer } from './components/ThinkingRenderer.js';
export { WebhookRenderer } from './components/WebhookRenderer.js';

export type {
  FormCheckboxElementProps,
  FormFileElementProps,
  FormInputElementProps,
  FormSelectElementProps,
  FormSensitiveIndicatorElementProps,
  FormSubmitElementProps,
  FormTextareaElementProps,
} from './components/form/element-props.js';
export {
  DefaultCheckbox,
  DefaultFile,
  DefaultInput,
  DefaultSelect,
  DefaultSensitiveIndicator,
  DefaultSubmitButton,
  DefaultTextarea,
} from './components/form/default-elements.js';

/**
 * TraceScope Integrations
 * 
 * 开箱即用的框架集成包
 * 
 * @example
 * import { LangChainIntegration } from 'react-tracescope/integrations/langchain';
 * import { AutoGenIntegration } from 'react-tracescope/integrations/autogen';
 * import { DifyIntegration } from 'react-tracescope/integrations/dify';
 */

export { LangChainIntegration, createLangChainConfig } from './langchain';
export { AutoGenIntegration, createAutoGenConfig } from './autogen';
export { DifyIntegration, createDifyConfig } from './dify';

// Re-export all framework types
export type { LangChainTrace } from '../examples/frameworks/langchain';
export type { AutoGenEvent } from '../examples/frameworks/autogen';
export type { DifyEvent } from '../examples/frameworks/dify';

// Re-export all demo data
export {
  langchainAgentTrace,
  langchainAgentEvents,
  langchainSimpleChain,
  transformLangChainTrace,
} from '../examples/frameworks/langchain';

export {
  autogenMultiAgentTrace,
  autogenMultiAgentEvents,
  autogenSimpleChat,
  autogenCodeExecution,
  transformAutoGenEvents,
} from '../examples/frameworks/autogen';

export {
  difyCustomerServiceWorkflow,
  difyCustomerServiceEvents,
  difySimpleChat,
  difyConditionalWorkflow,
  transformDifyEvents,
} from '../examples/frameworks/dify';


/**
 * Avatar Component
 * 节点类型图标，根据节点类型自动着色
 */

import React, { type ComponentPropsWithRef, type ReactElement } from 'react';
import cn from 'classnames';
import {
  User,
  Zap,
  Wrench,
  Code,
  Terminal,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { NodeTypeName } from '../../types/node';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<AvatarSize, { container: string; icon: string }> = {
  xs: { container: 'w-4 h-4', icon: 'w-2.5 h-2.5' },
  sm: { container: 'w-5 h-5', icon: 'w-3 h-3' },
  md: { container: 'w-6 h-6', icon: 'w-4 h-4' },
  lg: { container: 'w-8 h-8', icon: 'w-5 h-5' },
  xl: { container: 'w-10 h-10', icon: 'w-6 h-6' },
};

const NODE_TYPE_CONFIG: Record<
  NodeTypeName,
  { label: string; icon: typeof User; bgClass: string }
> = {
  user_input: {
    label: 'User',
    icon: User,
    bgClass: 'bg-indigo-500 text-white',
  },
  assistant_thought: {
    label: 'AI',
    icon: Zap,
    bgClass: 'bg-purple-500 text-white',
  },
  tool_call: {
    label: 'Tool',
    icon: Wrench,
    bgClass: 'bg-orange-500 text-white',
  },
  code_execution: {
    label: 'Code',
    icon: Code,
    bgClass: 'bg-cyan-500 text-white',
  },
  execution_result: {
    label: 'Result',
    icon: Terminal,
    bgClass: 'bg-emerald-500 text-white',
  },
  final_output: {
    label: 'Output',
    icon: CheckCircle,
    bgClass: 'bg-sky-500 text-white',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    bgClass: 'bg-red-500 text-white',
  },
};

export interface AvatarProps extends ComponentPropsWithRef<'div'> {
  /**
   * 节点类型
   */
  nodeType: NodeTypeName;
  /**
   * 尺寸
   * @default 'sm'
   */
  size?: AvatarSize;
  /**
   * 自定义图标
   */
  icon?: ReactElement;
  /**
   * 圆角
   * @default 'sm'
   */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Avatar({
  nodeType,
  size = 'sm',
  icon,
  rounded = 'sm',
  className,
  ...rest
}: AvatarProps): ReactElement {
  const config = NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.final_output;
  const { container, icon: iconSize } = sizeClasses[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-center font-medium',
        container,
        roundedClasses[rounded],
        config.bgClass,
        className
      )}
      title={config.label}
      {...rest}
    >
      {icon || <Icon className={iconSize} aria-hidden />}
    </div>
  );
}

export default Avatar;

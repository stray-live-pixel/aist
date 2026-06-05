import { type ReactNode } from 'react';

import styles from '../MessageList.module.scss';

export function AnimatedMessageGroup({ children, animate }: { children: ReactNode; animate: boolean }) {
  return <div className={animate ? styles.messageEnter : styles.messageItem}>{children}</div>;
}

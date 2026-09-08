import type { ReactNode } from "react";
import styles from "./page-header.module.css";

type PageHeaderProps = {
  description?: ReactNode;
  leading?: ReactNode;
  supporting?: ReactNode;
  title: ReactNode;
  titleId?: string;
  trailing?: ReactNode;
};

export function PageHeader({
  description,
  leading,
  supporting,
  title,
  titleId,
  trailing,
}: Readonly<PageHeaderProps>) {
  return (
    <header className={leading ? styles.root : `${styles.root} ${styles.withoutLeading}`}>
      {leading ? <div className={styles.leading}>{leading}</div> : null}
      <div className={styles.content}>
        <h1 id={titleId}>{title}</h1>
        {description ? <p>{description}</p> : null}
        {supporting ? <div className={styles.supporting}>{supporting}</div> : null}
      </div>
      {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
    </header>
  );
}

import React from "react";
import styles from "./Container.module.css";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}

const Container: React.FC<ContainerProps> = ({
  children,
  className = "",
  narrow = false,
}) => (
  <div
    className={[styles.container, narrow ? styles.narrow : "", className]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </div>
);

export default Container;

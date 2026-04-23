"use client";

import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export interface SkeletonLoaderProps {
  rows?: number;
  height?: number | string;
  width?: number | string;
  className?: string;
  circle?: boolean;
  variant?: "text" | "table" | "page" | "form" | "card";
}

export const TableRowSkeleton: React.FC = () => (
  <tr>
    <td><Skeleton height={20} width="80%" /></td>
    <td><Skeleton height={20} width="90%" /></td>
    <td><Skeleton height={20} width="75%" /></td>
    <td><Skeleton height={20} width="85%" /></td>
    <td><Skeleton height={20} width="70%" /></td>
    <td><Skeleton height={20} width="65%" /></td>
    <td><Skeleton height={20} width="60%" /></td>
    <td><Skeleton height={20} width="55%" /></td>
  </tr>
);

export const FormSkeleton: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
    <Skeleton height={40} width="100%" />
    <Skeleton height={40} width="100%" />
    <Skeleton height={100} width="100%" />
    <Skeleton height={40} width="150px" />
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
    <Skeleton height={60} width="100%" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} height={200} width="100%" style={{ borderRadius: "8px" }} />
      ))}
    </div>
  </div>
);

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <Skeleton circle height={40} width={40} />
        <div style={{ flex: 1 }}>
          <Skeleton height={20} width="80%" style={{ marginBottom: "0.5rem" }} />
          <Skeleton height={16} width="60%" />
        </div>
      </div>
    ))}
  </div>
);

export const ButtonSkeleton: React.FC = () => (
  <Skeleton height={40} width={120} style={{ borderRadius: "8px" }} />
);

export const AvatarSkeleton: React.FC = () => (
  <Skeleton circle height={40} width={40} />
);

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  rows = 3,
  height = 20,
  width = "100%",
  className,
  circle = false,
  variant = "text",
}) => {
  if (variant === "table") {
    return (
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </tbody>
    );
  }

  if (variant === "form") {
    return <FormSkeleton />;
  }

  if (variant === "page") {
    return <PageSkeleton />;
  }

  if (variant === "card") {
    return <CardSkeleton count={rows} />;
  }

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          height={height}
          width={width}
          circle={circle}
          style={{ borderRadius: circle ? "50%" : "8px" }}
        />
      ))}
    </div>
  );
};

export default SkeletonLoader;

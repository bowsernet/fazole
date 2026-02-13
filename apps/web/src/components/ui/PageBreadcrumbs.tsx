import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Anchor, Breadcrumbs, Text } from '@mantine/core';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function PageBreadcrumbs({ items }: PageBreadcrumbsProps): ReactElement {
  return (
    <Breadcrumbs mb="md">
      {items.map((item) =>
        item.href ? (
          <Anchor component={Link} to={item.href} key={item.label} size="sm">
            {item.label}
          </Anchor>
        ) : (
          <Text key={item.label} size="sm">
            {item.label}
          </Text>
        )
      )}
    </Breadcrumbs>
  );
}

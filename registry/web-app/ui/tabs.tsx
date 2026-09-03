'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex w-full items-center justify-start', className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'h-[63px]',
      'typo-body-base-semibold cursor-pointer px-4 py-4',
      'relative inline-flex items-center justify-center whitespace-nowrap transition-colors duration-200',
      'disabled:text-content-dark-4 disabled:pointer-events-none',
      'text-content-dark-2 hover:text-content-dark-1',
      'focus-visible:outline-none',
      // Active/Focus styles
      'data-[state=active]:text-action-primary-red-default',
      'focus-visible:text-action-primary-red-default',
      // Animated border using a pseudo-element
      'after:bg-action-primary-red-default after:absolute after:right-0 after:bottom-[-1px] after:left-0 after:h-[2px] after:origin-center after:scale-x-0 after:transition-transform after:duration-300',
      'data-[state=active]:after:scale-x-100',
      'focus-visible:after:scale-x-100',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4',
      'data-[state=active]:animate-in data-[state=active]:fade-in-0 duration-300',
      'focus-visible:outline-none',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

import React from 'react'
import DevelopmentInProgressSVG from '@/components/ui/development-in-progress/DevelopmentInProgressSVG.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'

const DevelopmentInProgressPage: React.FC = () => {
  return (
    <>
      <PageTitle />
      <Flex direction={'column'} align={'center'} justify={'center'} flexGrow={'1'}>
        <DevelopmentInProgressSVG />

        <Text className={'text-content-dark-2'}>
          Development in progress
          <span className="dot-loader" />
        </Text>
      </Flex>
    </>
  )
}

export default DevelopmentInProgressPage

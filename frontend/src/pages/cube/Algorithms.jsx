import React from 'react';
import useAlgorithms from '../../hooks/useAlgorithms';
import { AlgoCard, AlgoFormula, AlgoImage, AlgoTitle, Container, Grid, TabButton, TabContainer, Title } from './TimerStyled';

const Algorithms = () => {
  const { activeTab, setActiveTab, algoData, getImageUrl } = useAlgorithms();

  return (
    <Container>
      <Title>큐브 필수 알고리즘 (CFOP)</Title>

      <TabContainer>
        {['F2L', 'OLL', 'PLL'].map((tab) => (
          <TabButton
            key={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}>
            {tab}
          </TabButton>
        ))}
      </TabContainer>

      <Grid>
        {algoData[activeTab]?.map((algo) => (
          <AlgoCard key={algo.id}>
            <AlgoImage
              src={getImageUrl(algo)}
              alt={algo.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/150?text=Image+Error';
              }}
            />
            <AlgoTitle>{algo.name}</AlgoTitle>
            <AlgoFormula>{algo.formula}</AlgoFormula>
          </AlgoCard>
        ))}
      </Grid>
    </Container>
  );
};

export default Algorithms;
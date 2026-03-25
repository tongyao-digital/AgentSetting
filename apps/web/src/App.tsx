import { Layout, Tabs, Typography } from 'antd';

import { CapabilityManagement } from './pages/capability-management';
import { CategoryManagement } from './pages/category-management';
import { SyncJobPanel } from './pages/sync-job-panel';
import { abilityApi } from './services/ability-api';

const { Header, Content } = Layout;

export function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          Ability Management Console
        </Typography.Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Tabs
          items={[
            { key: 'category', label: '分类管理', children: <CategoryManagement api={abilityApi} /> },
            { key: 'capability', label: '能力管理', children: <CapabilityManagement api={abilityApi} /> },
            { key: 'sync', label: '同步任务', children: <SyncJobPanel api={abilityApi} /> },
          ]}
        />
      </Content>
    </Layout>
  );
}

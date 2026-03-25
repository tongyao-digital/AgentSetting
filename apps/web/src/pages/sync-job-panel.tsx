import { Button, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { AbilityApi } from '../services/ability-api';
import type { SyncJobItem } from '../types/api-contract';
import { getErrorMessage } from '../utils/error';

const STATUS_COLOR: Record<string, string> = {
  running: 'processing',
  success: 'success',
  failed: 'error',
  partial: 'warning',
};

export function SyncJobPanel({ api }: { api: AbilityApi }) {
  const [items, setItems] = useState<SyncJobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.listSyncJobs();
      setItems(data.list || []);
    } catch (error) {
      messageApi.error(getErrorMessage(error, '加载同步任务失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const onTrigger = async () => {
    setTriggering(true);
    try {
      await api.triggerSync();
      messageApi.success('同步任务已触发');
      await loadJobs();
    } catch (error) {
      messageApi.error(getErrorMessage(error, '触发同步失败'));
    } finally {
      setTriggering(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: '任务ID',
        dataIndex: 'id',
        key: 'id',
      },
      {
        title: '类型',
        dataIndex: 'job_type',
        key: 'job_type',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <Tag color={STATUS_COLOR[value] || 'default'}>{value}</Tag>,
      },
      {
        title: '成功数',
        dataIndex: 'success_count',
        key: 'success_count',
      },
      {
        title: '失败数',
        dataIndex: 'fail_count',
        key: 'fail_count',
      },
      {
        title: '开始时间',
        dataIndex: 'started_at',
        key: 'started_at',
      },
    ],
    [],
  );

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            同步任务
          </Typography.Title>
          <Button type="primary" onClick={() => void onTrigger()} loading={triggering}>
            手动触发同步
          </Button>
        </Space>

        <Table<SyncJobItem>
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={columns}
          dataSource={items}
          locale={{ emptyText: '暂无同步任务' }}
        />
      </Space>
    </>
  );
}

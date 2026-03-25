import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { AbilityApi } from '../services/ability-api';
import type { CapabilityDetail, CapabilityRequestConfig, CapabilityType, HttpMethod } from '../types/api-contract';
import {
  CAPABILITY_TYPE_OPTIONS,
  MANUAL_CAPABILITY_TYPE_OPTIONS,
  canDeleteCapability,
  canEditCapability,
  getCapabilityTypeLabel,
} from '../utils/capability';
import {
  type CapabilityFormValue,
  buildCapabilityCreateBody,
  buildCapabilityUpdateBody,
} from '../utils/capability-form';
import { getErrorMessage } from '../utils/error';

type CapabilityRow = CapabilityDetail;

type QueryState = {
  keyword: string;
  capability_type?: CapabilityType;
};

type EditState =
  | { mode: 'create'; target: null }
  | { mode: 'edit'; target: CapabilityRow };

function getRequestConfig(row: CapabilityRow): CapabilityRequestConfig | null {
  return row.request_config || null;
}

export function CapabilityManagement({ api }: { api: AbilityApi }) {
  const [items, setItems] = useState<CapabilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<QueryState>({ keyword: '' });

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editState, setEditState] = useState<EditState>({ mode: 'create', target: null });

  const [form] = Form.useForm<CapabilityFormValue>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadCapabilities = async (nextQuery: QueryState) => {
    setLoading(true);
    try {
      const data = await api.listCapabilities({
        keyword: nextQuery.keyword || undefined,
        capability_type: nextQuery.capability_type,
      });

      setItems((data.list || []) as CapabilityRow[]);
    } catch (error) {
      messageApi.error(getErrorMessage(error, '加载能力列表失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCapabilities(query);
  }, []);

  const onCreate = () => {
    setEditState({ mode: 'create', target: null });
    form.setFieldsValue({
      capability_name: '',
      capability_type: 'EXT_APP',
      category_id: '1',
      intro: '',
      method: 'GET',
      url: '',
    });
    setOpen(true);
  };

  const onEdit = (row: CapabilityRow) => {
    if (!canEditCapability(row.source)) {
      return;
    }

    const req = getRequestConfig(row);
    setEditState({ mode: 'edit', target: row });
    form.setFieldsValue({
      capability_name: row.capability_name,
      capability_type: row.capability_type,
      category_id: row.category_id,
      intro: row.intro || '',
      method: req?.method || 'GET',
      url: req?.url || '',
    });
    setOpen(true);
  };

  const onDelete = async (row: CapabilityRow) => {
    if (!canDeleteCapability(row.source)) {
      return;
    }

    try {
      await api.deleteCapability({ id: row.id });
      messageApi.success('删除成功');
      await loadCapabilities(query);
    } catch (error) {
      messageApi.error(getErrorMessage(error, '删除失败'));
    }
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);

    try {
      if (editState.mode === 'create') {
        await api.createCapability(buildCapabilityCreateBody(values));
      } else {
        const next = buildCapabilityUpdateBody(values, {
          version: editState.target.version,
          capability_type: editState.target.capability_type,
        });

        if (next.typeChanged) {
          const confirmed = window.confirm('修改能力类型会清空请求配置，是否继续？');
          if (!confirmed) {
            setSubmitting(false);
            return;
          }
        }

        await api.updateCapability({ id: editState.target.id }, next.body);
      }

      setOpen(false);
      messageApi.success('保存成功');
      await loadCapabilities(query);
    } catch (error) {
      console.log('ty_log--[error] : -140', error)
      messageApi.error(getErrorMessage(error, '保存失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: '能力名称',
        dataIndex: 'capability_name',
        key: 'capability_name',
      },
      {
        title: '能力类型',
        dataIndex: 'capability_type',
        key: 'capability_type',
        render: (value: string) => getCapabilityTypeLabel(value),
      },
      {
        title: '来源',
        dataIndex: 'source',
        key: 'source',
        render: (value: string) =>
          value === 'sync' ? <Tag color="gold">同步</Tag> : <Tag color="green">自建</Tag>,
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, row: CapabilityRow) => (
          <Space>
            <Button type="link" disabled={!canEditCapability(row.source)} onClick={() => onEdit(row)}>
              编辑
            </Button>
            <Button type="link" danger disabled={!canDeleteCapability(row.source)} onClick={() => void onDelete(row)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [query],
  );

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            能力管理
          </Typography.Title>
          <Button type="primary" onClick={onCreate}>
            新增能力
          </Button>
        </Space>

        <Space wrap>
          <Input
            placeholder="搜索能力名称"
            value={query.keyword}
            onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder="能力类型"
            style={{ width: 180 }}
            value={query.capability_type}
            options={CAPABILITY_TYPE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            onChange={(value) => setQuery((prev) => ({ ...prev, capability_type: value }))}
          />
          <Button onClick={() => void loadCapabilities(query)}>查询</Button>
        </Space>

        <Table<CapabilityRow>
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={columns}
          dataSource={items}
          locale={{ emptyText: '暂无能力' }}
        />
      </Space>

      <Modal
        title={editState.mode === 'create' ? '新增能力' : '编辑能力'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void onSubmit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={submitting}
      >
        <Form<CapabilityFormValue> layout="vertical" form={form} autoComplete="off">
          <Form.Item
            label="能力名称"
            name="capability_name"
            rules={[{ required: true, message: '请输入能力名称' }, { max: 10, message: '最多10个字符' }]}
          >
            <Input maxLength={10} />
          </Form.Item>

          <Form.Item label="能力类型" name="capability_type" rules={[{ required: true, message: '请选择能力类型' }]}>
            <Select
              options={
                editState.mode === 'create'
                  ? MANUAL_CAPABILITY_TYPE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))
                  : CAPABILITY_TYPE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))
              }
            />
          </Form.Item>

          <Form.Item
            label="分类ID"
            name="category_id"
            rules={[{ required: true, message: '请输入分类ID' }, { pattern: /^[0-9]+$/, message: '请输入数字字符串' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="简介" name="intro" rules={[{ max: 10, message: '最多10个字符' }]}>
            <Input maxLength={10} />
          </Form.Item>

          <Form.Item
            label="请求方法"
            name="method"
            rules={[{ required: true, message: '请选择请求方法' }]}
          >
            <Select
              options={['GET', 'POST', 'HEAD', 'PATCH', 'PUT', 'DELETE'].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="请求URL"
            name="url"
            rules={[{ required: true, message: '请输入请求URL' }, { type: 'url', message: 'URL格式不正确' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

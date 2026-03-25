import { Button, Form, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { CategoryAPI, CategoryItem } from '../types/api-contract';
import type { AbilityApi } from '../services/ability-api';
import { getErrorMessage } from '../utils/error';

type FormValue = {
  name: string;
  sort: string;
};

type EditState =
  | { mode: 'create'; target: null }
  | { mode: 'edit'; target: CategoryItem };

function isBuiltin(item: CategoryItem): boolean {
  return String(item.is_builtin) === '1';
}

export function CategoryManagement({ api }: { api: AbilityApi }) {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editState, setEditState] = useState<EditState>({ mode: 'create', target: null });
  const [form] = Form.useForm<FormValue>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api.listCategories();
      setItems(data.list || []);
    } catch (error) {
      messageApi.error(getErrorMessage(error, '加载分类失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const onCreate = () => {
    setEditState({ mode: 'create', target: null });
    form.setFieldsValue({ name: '', sort: '10' });
    setOpen(true);
  };

  const onEdit = (item: CategoryItem) => {
    setEditState({ mode: 'edit', target: item });
    form.setFieldsValue({ name: item.name, sort: item.sort });
    setOpen(true);
  };

  const onDelete = async (item: CategoryItem) => {
    if (isBuiltin(item)) {
      return;
    }

    try {
      await api.deleteCategory({ id: item.id });
      messageApi.success('删除成功');
      await loadCategories();
    } catch (error) {
      messageApi.error(getErrorMessage(error, '删除失败'));
    }
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);

    try {
      if (editState.mode === 'create') {
        await api.createCategory({
          name: values.name.trim(),
          sort: values.sort,
        });
      } else {
        await api.updateCategory(
          { id: editState.target.id },
          {
            name: values.name.trim(),
            sort: values.sort,
            version: editState.target.version,
          },
        );
      }

      setOpen(false);
      messageApi.success('保存成功');
      await loadCategories();
    } catch (error) {
      messageApi.error(getErrorMessage(error, '保存失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: '分类名称',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: '排序',
        dataIndex: 'sort',
        key: 'sort',
      },
      {
        title: '类型',
        key: 'type',
        render: (_: unknown, item: CategoryItem) =>
          isBuiltin(item) ? <Tag color="blue">内置</Tag> : <Tag>自定义</Tag>,
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, item: CategoryItem) => {
          const disabled = isBuiltin(item);
          return (
            <Space>
              <Button type="link" disabled={disabled} onClick={() => onEdit(item)}>
                编辑
              </Button>
              <Button type="link" danger disabled={disabled} onClick={() => void onDelete(item)}>
                删除
              </Button>
            </Space>
          );
        },
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
            分类管理
          </Typography.Title>
          <Button type="primary" onClick={onCreate}>
            新增分类
          </Button>
        </Space>

        <Table<CategoryItem>
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={columns}
          dataSource={items}
          locale={{ emptyText: '暂无分类' }}
        />
      </Space>

      <Modal
        title={editState.mode === 'create' ? '新增分类' : '编辑分类'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void onSubmit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={submitting}
      >
        <Form<FormValue> form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }, { max: 10, message: '最多10个字符' }]}
          >
            <Input maxLength={10} />
          </Form.Item>
          <Form.Item
            label="排序"
            name="sort"
            rules={[{ required: true, message: '请输入排序值' }, { pattern: /^[0-9]+$/, message: '请输入数字字符串' }]}
          >
            <Input maxLength={10} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

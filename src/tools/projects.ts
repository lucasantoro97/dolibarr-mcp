import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  // --- Projects ---
  server.registerTool('dolibarr_list_projects', {
    description: 'List/search projects.',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/projects', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_project', {
    description: 'Get project details by ID.',
    inputSchema: { id: z.number().int().describe('Project ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/projects/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_project', {
    description: 'Create a new project.',
    inputSchema: {
      ref: z.string().describe('Project reference'),
      title: z.string().describe('Project title'),
      socid: z.number().int().optional().describe('Third party ID'),
      description: z.string().optional(),
      date_start: z.string().optional(),
      date_end: z.string().optional(),
      opp_amount: z.number().optional().describe('Opportunity amount'),
      opp_percent: z.number().optional().describe('Probability %'),
      opp_status: z.number().int().optional().describe('Opportunity status'),
      status: z.number().int().optional().describe('0=draft, 1=validated, 2=closed'),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/projects', args);
      return ok({ id: Number(id), message: `Project created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_project', {
    description: 'Update a project.',
    inputSchema: {
      id: z.number().int().describe('Project ID'),
      title: z.string().optional(),
      description: z.string().optional(),
      date_start: z.string().optional(),
      date_end: z.string().optional(),
      opp_amount: z.number().optional(),
      opp_percent: z.number().optional(),
      status: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/projects/${id}`, payload);
      return ok({ message: `Project ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_project', {
    description: 'Delete a project.',
    inputSchema: { id: z.number().int().describe('Project ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/projects/${args.id}`);
      return ok({ message: `Project ${args.id} deleted` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_project_tasks', {
    description: 'List tasks for a project.',
    inputSchema: { id: z.number().int().describe('Project ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/projects/${args.id}/tasks`)); }
    catch (e) { return err(e); }
  });

  // --- Tasks ---
  server.registerTool('dolibarr_list_tasks', {
    description: 'List all tasks (optionally filter by project).',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/tasks', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_task', {
    description: 'Get task details by ID.',
    inputSchema: { id: z.number().int().describe('Task ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/tasks/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_task', {
    description: 'Create a new task.',
    inputSchema: {
      fk_project: z.number().int().describe('Project ID'),
      label: z.string().describe('Task label'),
      description: z.string().optional(),
      date_start: z.string().optional(),
      date_end: z.string().optional(),
      planned_workload: z.number().optional().describe('Planned workload in seconds'),
      progress: z.number().int().optional().describe('Progress 0-100'),
    },
  }, async (args) => {
    try {
      const id = await api.post('/tasks', args);
      return ok({ id: Number(id), message: `Task created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_task', {
    description: 'Update a task.',
    inputSchema: {
      id: z.number().int().describe('Task ID'),
      label: z.string().optional(),
      description: z.string().optional(),
      date_start: z.string().optional(),
      date_end: z.string().optional(),
      progress: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/tasks/${id}`, payload);
      return ok({ message: `Task ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_task_time', {
    description: 'Log time spent on a task.',
    inputSchema: {
      id: z.number().int().describe('Task ID'),
      date: z.string().describe('Date (YYYY-MM-DD)'),
      duration: z.number().describe('Duration in seconds'),
      user_id: z.number().int().describe('User ID'),
      note: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.post(`/tasks/${id}/addtimespent`, payload);
      return ok({ message: `Time logged on task ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_task_time', {
    description: 'List time entries for a task.',
    inputSchema: { id: z.number().int().describe('Task ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/tasks/${args.id}/timespent`)); }
    catch (e) { return err(e); }
  });
}

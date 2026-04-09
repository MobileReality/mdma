#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMdmaMcpServer } from '../index.js';

const server = createMdmaMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);

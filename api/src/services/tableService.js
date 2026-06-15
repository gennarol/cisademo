const { TableClient, TableServiceClient } = require('@azure/data-tables');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

const TABLES = {
  ORDERS: 'Orders',
  ORDER_LINES: 'OrderLines',
  CORRECTION_REQUESTS: 'CorrectionRequests',
};

/**
 * Get or create a TableClient for the given table name.
 */
function getTableClient(tableName) {
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
  }
  return TableClient.fromConnectionString(connectionString, tableName);
}

/**
 * Ensure all required tables exist.
 */
async function ensureTables() {
  if (!connectionString) return;
  const serviceClient = TableServiceClient.fromConnectionString(connectionString);
  for (const table of Object.values(TABLES)) {
    try {
      await serviceClient.createTable(table);
    } catch (err) {
      // Table already exists — ignore 409
      if (err.statusCode !== 409) throw err;
    }
  }
}

/**
 * Serialize an order object for Azure Table Storage.
 * PartitionKey = "ORDER", RowKey = order.id
 */
function orderToEntity(order) {
  return {
    partitionKey: 'ORDER',
    rowKey: order.id,
    orderNumber: order.orderNumber,
    date: order.date,
    status: order.status,
    totalAmount: order.totalAmount,
    scoreAI: order.scoreAI,
    customerStatus: order.customerStatus,
    // Store complex objects as JSON strings
    customer: JSON.stringify(order.customer),
    customerSuggestions: order.customerSuggestions ? JSON.stringify(order.customerSuggestions) : null,
    agent: JSON.stringify(order.agent),
    warnings: JSON.stringify(order.warnings || []),
    email: JSON.stringify(order.email || {}),
    emailSubject: order.emailSubject || '',
    emailFrom: order.emailFrom || '',
    receivedAt: order.receivedAt,
  };
}

/**
 * Deserialize a Table entity back to an order object.
 */
function entityToOrder(entity) {
  return {
    id: entity.rowKey,
    orderNumber: entity.orderNumber,
    date: entity.date,
    status: entity.status,
    totalAmount: entity.totalAmount,
    scoreAI: entity.scoreAI,
    customerStatus: entity.customerStatus,
    customer: safeJsonParse(entity.customer, {}),
    customerSuggestions: safeJsonParse(entity.customerSuggestions, null),
    agent: safeJsonParse(entity.agent, {}),
    warnings: safeJsonParse(entity.warnings, []),
    email: safeJsonParse(entity.email, {}),
    emailSubject: entity.emailSubject || '',
    emailFrom: entity.emailFrom || '',
    receivedAt: entity.receivedAt,
  };
}

/**
 * Serialize an order line for storage.
 * PartitionKey = orderId, RowKey = lineId
 */
function lineToEntity(orderId, line) {
  return {
    partitionKey: orderId,
    rowKey: line.id,
    lineNumber: line.lineNumber,
    productId: line.productId || '',
    productName: line.productName || '',
    um: line.um || '',
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
    scoreAI: line.scoreAI,
    articleStatus: line.articleStatus || 'found',
    configStatus: line.configStatus || 'none',
    priceMismatch: line.priceMismatch || false,
    neverOrdered: line.neverOrdered || false,
    umMissing: line.umMissing || false,
    originalText: line.originalText || '',
    warnings: JSON.stringify(line.warnings || []),
    suggestedProducts: line.suggestedProducts ? JSON.stringify(line.suggestedProducts) : null,
  };
}

/**
 * Deserialize a line entity.
 */
function entityToLine(entity) {
  return {
    id: entity.rowKey,
    lineNumber: entity.lineNumber,
    productId: entity.productId || '',
    productName: entity.productName || '',
    um: entity.um || '',
    quantity: entity.quantity,
    unitPrice: entity.unitPrice,
    totalPrice: entity.totalPrice,
    scoreAI: entity.scoreAI,
    articleStatus: entity.articleStatus || 'found',
    configStatus: entity.configStatus || 'none',
    priceMismatch: !!entity.priceMismatch,
    neverOrdered: !!entity.neverOrdered,
    umMissing: !!entity.umMissing,
    originalText: entity.originalText || null,
    warnings: safeJsonParse(entity.warnings, []),
    suggestedProducts: safeJsonParse(entity.suggestedProducts, null),
  };
}

/**
 * Serialize a correction request.
 * PartitionKey = orderId, RowKey = request.id (as string)
 */
function correctionToEntity(orderId, req) {
  return {
    partitionKey: orderId,
    rowKey: String(req.id),
    message: req.message,
    channel: req.channel,
    date: req.date,
  };
}

function entityToCorrection(entity) {
  return {
    id: entity.rowKey,
    message: entity.message,
    channel: entity.channel,
    date: entity.date,
  };
}

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

module.exports = {
  TABLES,
  getTableClient,
  ensureTables,
  orderToEntity,
  entityToOrder,
  lineToEntity,
  entityToLine,
  correctionToEntity,
  entityToCorrection,
};

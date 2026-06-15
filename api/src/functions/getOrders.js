const { app } = require('@azure/functions');
const { getTableClient, TABLES, entityToOrder, entityToLine, entityToCorrection } = require('../services/tableService');

app.http('getOrders', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, context) => {
    try {
      const ordersClient = getTableClient(TABLES.ORDERS);
      const linesClient = getTableClient(TABLES.ORDER_LINES);
      const correctionsClient = getTableClient(TABLES.CORRECTION_REQUESTS);

      // Fetch all tables in parallel (3 queries instead of N*2+1)
      const [ordersRaw, linesRaw, correctionsRaw] = await Promise.all([
        collectEntities(ordersClient),
        collectEntities(linesClient),
        collectEntities(correctionsClient),
      ]);

      // Index lines and corrections by partitionKey (orderId)
      const linesByOrder = new Map();
      for (const entity of linesRaw) {
        const orderId = entity.partitionKey;
        if (!linesByOrder.has(orderId)) linesByOrder.set(orderId, []);
        linesByOrder.get(orderId).push(entityToLine(entity));
      }

      const corrByOrder = new Map();
      for (const entity of correctionsRaw) {
        const orderId = entity.partitionKey;
        if (!corrByOrder.has(orderId)) corrByOrder.set(orderId, []);
        corrByOrder.get(orderId).push(entityToCorrection(entity));
      }

      // Assemble orders
      const orders = ordersRaw.map(entity => {
        const order = entityToOrder(entity);
        order.lines = (linesByOrder.get(order.id) || []).sort((a, b) => a.lineNumber - b.lineNumber);
        order.correctionRequests = (corrByOrder.get(order.id) || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        return order;
      });

      // Sort by date desc
      orders.sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        status: 200,
        jsonBody: orders,
      };
    } catch (error) {
      context.error('Error fetching orders:', error);
      return { status: 500, jsonBody: { error: 'Failed to fetch orders' } };
    }
  }
});

async function collectEntities(client) {
  const entities = [];
  const iterator = client.listEntities();
  for await (const entity of iterator) {
    entities.push(entity);
  }
  return entities;
}

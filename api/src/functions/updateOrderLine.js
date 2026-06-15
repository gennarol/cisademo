const { app } = require('@azure/functions');
const { getTableClient, TABLES, entityToLine, lineToEntity } = require('../services/tableService');

app.http('updateOrderLine', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'orders/{orderId}/lines/{lineId}',
  handler: async (request, context) => {
    const { orderId, lineId } = request.params;

    try {
      const updates = await request.json();
      const linesClient = getTableClient(TABLES.ORDER_LINES);

      // Fetch existing line
      let entity;
      try {
        entity = await linesClient.getEntity(orderId, lineId);
      } catch (err) {
        if (err.statusCode === 404) {
          return { status: 404, jsonBody: { error: 'Order line not found' } };
        }
        throw err;
      }

      const line = entityToLine(entity);

      // Apply updates
      const allowedFields = [
        'productId', 'productName', 'um', 'quantity', 'unitPrice', 'totalPrice',
        'articleStatus', 'configStatus', 'priceMismatch', 'neverOrdered', 'umMissing',
        'originalText', 'warnings', 'suggestedProducts'
      ];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          line[field] = updates[field];
        }
      }

      // Recalculate totalPrice if qty/price changed
      if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
        line.totalPrice = +(line.quantity * line.unitPrice).toFixed(2);
      }

      // Save updated line
      const updatedEntity = lineToEntity(orderId, line);
      await linesClient.updateEntity(updatedEntity, 'Replace');

      // If totalPrice changed, update order total
      if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
        await recalculateOrderTotal(orderId);
      }

      return {
        status: 200,
        jsonBody: { id: lineId, message: 'Line updated successfully' },
      };
    } catch (error) {
      context.error('Error updating order line:', error);
      return { status: 500, jsonBody: { error: 'Failed to update order line' } };
    }
  }
});

async function recalculateOrderTotal(orderId) {
  const linesClient = getTableClient(TABLES.ORDER_LINES);
  const ordersClient = getTableClient(TABLES.ORDERS);

  let total = 0;
  const linesIterator = linesClient.listEntities({
    queryOptions: { filter: `PartitionKey eq '${orderId}'` }
  });
  for await (const entity of linesIterator) {
    total += entity.totalPrice || 0;
  }

  // Update order total
  const orderEntity = await ordersClient.getEntity('ORDER', orderId);
  orderEntity.totalAmount = +total.toFixed(2);
  await ordersClient.updateEntity(orderEntity, 'Replace');
}

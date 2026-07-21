import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";

export const receiptService = {
  async upload(
    userId: string,
    file: Express.Multer.File
  ) {
    const groceries = await prisma.category.findFirst({
      where: {
        userId,
        isActive: true,
        name: { contains: "grocery", mode: "insensitive" }
      }
    });

    /*
     * Prototype OCR stub.
     * Replace this block with Google Vision, AWS Textract,
     * Azure Document Intelligence, Mindee, or another OCR provider.
     */
    const mockResult = {
      title: "Receipt Purchase",
      merchant: "Sample Store",
      amount: 45,
      expenseDate: new Date().toISOString(),
      suggestedCategoryId: groceries?.id ?? null,
      confidence: 0.72
    };

    const receipt = await prisma.receipt.create({
      data: {
        userId,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        filePath: file.path,
        status: "COMPLETED",
        extractedTitle: mockResult.title,
        extractedAmount: mockResult.amount,
        extractedDate: new Date(mockResult.expenseDate),
        suggestedCategoryId: mockResult.suggestedCategoryId,
        rawResult: mockResult
      }
    });

    return {
      receiptId: receipt.id,
      ...mockResult
    };
  },

  async get(userId: string, receiptId: string) {
    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, userId }
    });
    if (!receipt) throw new ApiError(404, "Receipt not found.");
    return receipt;
  }
};

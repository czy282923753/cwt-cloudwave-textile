export class EditorialDraftConflictError extends Error {
  constructor(message = "Editorial Draft changed in another editor; reload before saving.") {
    super(message);
    this.name = "EditorialDraftConflictError";
  }
}

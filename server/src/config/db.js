import mongoose from 'mongoose';

export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

let txnSupport;

export async function supportsTransactions() {
  if (txnSupport !== undefined) return txnSupport;
  try {
    const hello = await mongoose.connection.db.command({ hello: 1 });
    txnSupport = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    txnSupport = false;
  }
  return txnSupport;
}

export async function withTxn(work) {
  if (!(await supportsTransactions())) return work(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export function sessionOpts(session, extra = {}) {
  return session ? { ...extra, session } : extra;
}

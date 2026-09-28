import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser,serviceClient } from '@/lib/supabase/server';
import { checkOrigin,errorResponse } from '@/lib/server/http';
const schema=z.object({bookingId:z.uuid(),mimeType:z.enum(['image/jpeg','image/png','application/pdf']),byteSize:z.number().int().min(1).max(5242880)});
export async function POST(request:Request){try{checkOrigin(request);const {user}=await requireUser();const body=schema.parse(await request.json());const db=serviceClient();const {data:booking}=await db.from('bookings').select('id').eq('id',body.bookingId).eq('user_id',user.id).single();if(!booking)throw new Error('Booking not found.');const extension=body.mimeType==='application/pdf'?'pdf':body.mimeType==='image/png'?'png':'jpg';const path=`payment-proofs/${user.id}/${randomUUID()}.${extension}`;const {data,error}=await db.storage.from('payment-proofs').createSignedUploadUrl(path);if(error)throw new Error('Receipt uploads are not configured. Ask an administrator to create the private payment-proofs storage bucket.');return NextResponse.json({path,token:data.token});}catch(e){return errorResponse(e);}}

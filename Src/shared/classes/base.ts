import { Schema, Types } from "mongoose";
import { prop, buildSchema } from "@typegoose/typegoose";

// TODO: The front-end shouldn't rely on this class, since that will tightly couple it with mongoose/typegoose.
export abstract class BaseEntity {
	@prop({
		required: false
	})
	createdDate?: Date;

	@prop({
		required: false
	})
	updatedDate?: Date;

	id?: Types.ObjectId;

	static get schema(): Schema {
		return buildSchema(this as any, {
			timestamps: true,
			toJSON: {
				getters: true,
				virtuals: true,
			},
		});
	}

	static get modelName(): string {
		return this.name;
	}
}

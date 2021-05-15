import { prop, Ref, getModelForClass } from "@typegoose/typegoose";
import { BaseEntity } from "./base";
import { Stay } from "./stay";

export class Sitter extends BaseEntity {
	@prop({
		required: [true, "The sitter must have a name."],
		trim: true,
	})
	public name: string;

	@prop({
		required: false,
		trim: true,
	})
	public image: string;

	@prop({
		required: [true, "The sitter must have a phone number."],
		trim: true,
	})
	public phoneNumber: string;

	@prop({
		required: [true, "The sitter must have a unique email address."],
		unique: true,
		trim: true,
	})
	public emailAddress: string;

	@prop({
		ref: () => Stay,
	})
	private _stays: Array<Ref<Stay>>;

	@prop({})
	private _overallSitterRank: number;

	@prop({})
	private _ratingsScore: number;


	get stays(): Array<Ref<Stay>> {
		return this._stays;
	}

	get OverallSitterRank(): number {
		return this._overallSitterRank;
	}

	get RatingsScore(): number {
		return this._ratingsScore;
	}

	get SitterScore(): number {
		let preparedName: string = this.name ? this.name.toLowerCase().replace(/[^a-z0-9]/gi, '') : "";
		let uniqueLetterCount: number = new Set(preparedName.split('')).size;
		
		return (uniqueLetterCount / 26) * 5;
	}

	constructor(name: string, image: string, phoneNumber: string, emailAddress: string, stays?: Array<Ref<Stay>>) {
		super();

		this.name = name;
		this.image = image;
		this.phoneNumber = phoneNumber;
		this.emailAddress = emailAddress;
		this._stays = stays;
	}

	updateRatingsScore(): void {
		if (this._stays.length == 0)
		{
			this._ratingsScore = 0;
		}
		else
		{
			let ratingsSum: number = this._stays
				.map(stay => (stay as Stay).rating)         // TODO: We need to somehow resolve this Ref<Stay, ObjectId> into the actual Stay itself. What gives?
				.reduce((runningTotal, rating) => (runningTotal + rating));
			
			this._ratingsScore = (ratingsSum / this._stays.length);
		}
	}

	updateOverallRank(): void {
		// If the sitter has no Stays, then the OverallSitterRank is just their SitterScore.
		if (this._stays.length == 0)
		{
			this._overallSitterRank = this.SitterScore;
		}
		else
		{
			let ratingWeight = this._stays.length < 10 ? (this._stays.length / 10) : 1;
			this._overallSitterRank = (this.SitterScore * (1 - ratingWeight)) + (this._ratingsScore * ratingWeight);
		}
	}

	// TODO: Maybe change the return type of this to boolean to return success/fail information.
	addStay(stay: Stay): void
	{
		this._stays.push(stay);
		this.updateRatingsScore();
		this.updateOverallRank();
	}

	
	//TODO: Need to figure out what the best way to remove a Stay will be. By its ID?
	removeStay(stay: Stay)
	{
		let index: number = this._stays.indexOf(stay.id, 0);
		if(index > -1) {
			this._stays.splice(index, 0);
		}

		this.updateRatingsScore();
		this.updateOverallRank();
	}



}


export const SitterSchema = getModelForClass(Sitter);






//export = getModelForClass(SitterSchema);






/*

import mongoose = require("mongoose");
const Schema = mongoose.Schema;

var SitterSchema = new Schema(
{
    Name:
    {
        type: String,
        trim: true,
        required: [true, "The sitter must have a name."]
    },
    Image:
    {
        type: String,
        trim: true,
        required: false
    },
    PhoneNumber:
    {
        type: String,
        trim: true,
        required: [true, "The sitter must have a phone number."]
    },
    EmailAddress:
    {
        type: String,
        trim: true,
        required: [true, "The sitter must have an email address."]
    },
    // TODO: Instead of doing our score processing in middleware, could we do it in setters instead? The middleware is finnicky, and doesn't always get triggered when you think it will.
    Stays:
    [{
        type: Schema.Types.ObjectId,
        ref: "Stay"
    }],
    // We're forced to store both of these denormalized values because we want to create an index for searching/sorting on them.
    OverallSitterRank:
    {
        type: Number,
        index: true,
        select: true
    },
    RatingsScore:
    {
        type: Number,
        index: true,
        select: true
    }
},
{
    collection: "Sitters",
    toJSON:
    {
        virtuals: true
    }
});

SitterSchema.virtual("SitterScore").get(function()
{
    var preparedName = this.Name ? this.Name.toLowerCase().replace(/[^a-z0-9]/gi, '') : "";
    let uniqueLetterCount = new Set(preparedName.split('')).size;
    
    return (uniqueLetterCount / 26) * 5;
});

SitterSchema.virtual("NumberOfStays").get(function()
{
    return (this.Stays ? this.Stays.length : 0);
});

var calculateRatingsScoreForSitter = function (sitter)
{
    if (sitter.NumberOfStays == 0)
    {
        return 0;
    }
    else
    {
        var ratingsSum = sitter.Stays
            .map(stay => stay.Rating)
            .reduce((runningTotal, rating) => (runningTotal + rating));
        
        return (ratingsSum / sitter.NumberOfStays);
    }
}

var calculateOverallRankForSitter = function (sitter)
{
    // If the sitter has no Stays, then the OverallSitterRank is just their SitterScore.
    if (sitter.NumberOfStays == 0)
    {
        return sitter.SitterScore;
    }
    else
    {
        var ratingWeight = sitter.NumberOfStays < 10 ? (sitter.NumberOfStays / 10) : 1;
        return (sitter.SitterScore * (1 - ratingWeight)) + (sitter.RatingsScore * ratingWeight);
    }
}

SitterSchema.pre("save", function (next)
{
    this.RatingsScore = calculateRatingsScoreForSitter(this);
    this.OverallSitterRank = calculateOverallRankForSitter(this);

    next();
});

SitterSchema.methods.equals = function (other)
{
    return this.Name == other.Name
        && this.Image == other.Image
        && this.PhoneNumber == other.PhoneNumber
        && this.EmailAddress == other.EmailAddress;
};

SitterSchema.methods.toString = function ()
{
    return `Name: \"${this.Name}\", PhoneNumber: \"${this.PhoneNumber}\", EmailAddress: \"${this.EmailAddress}\"`;
}

SitterSchema.query.findMatching = function (other)
{
    return this.where({
        Name: other.Name,
        PhoneNumber: other.PhoneNumber,
        EmailAddress: other.EmailAddress,
        Image: other.Image
    }).populate("Stays");
}

export = mongoose.model("Sitter", SitterSchema);
*/
CREATE TABLE "player_season_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"appearances" integer,
	"starts" integer,
	"minutes" integer,
	"goals" integer,
	"assists" integer,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_season_stats_non_negative_chk" CHECK (("player_season_stats"."appearances" is null or "player_season_stats"."appearances" >= 0) and ("player_season_stats"."starts" is null or "player_season_stats"."starts" >= 0) and ("player_season_stats"."minutes" is null or "player_season_stats"."minutes" >= 0) and ("player_season_stats"."goals" is null or "player_season_stats"."goals" >= 0) and ("player_season_stats"."assists" is null or "player_season_stats"."assists" >= 0))
);
--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_season_stats_natural_uq" ON "player_season_stats" USING btree ("season_id","player_id","team_id","provider_id");
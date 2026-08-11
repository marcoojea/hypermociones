CREATE TYPE "public"."fixture_status" AS ENUM('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('AVAILABLE', 'DOUBTFUL', 'INJURED', 'SUSPENDED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."player_position" AS ENUM('POR', 'DEF', 'MED', 'DEL');--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"status" "import_status" DEFAULT 'PENDING' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"records_fetched" integer DEFAULT 0 NOT NULL,
	"records_inserted" integer DEFAULT 0 NOT NULL,
	"records_updated" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cursor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"access_method" text NOT NULL,
	"license_notes" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fantasy_player_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"price_cents" integer,
	"total_points" integer,
	"average_points" double precision,
	"ownership_percent" double precision,
	"market_trend" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fantasy_squad_players" (
	"fantasy_team_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"bought_at" timestamp with time zone NOT NULL,
	"purchase_price_cents" integer,
	CONSTRAINT "fantasy_squad_players_fantasy_team_id_player_id_pk" PRIMARY KEY("fantasy_team_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "fantasy_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"season_id" uuid NOT NULL,
	"rules_config" jsonb NOT NULL,
	"budget_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixture_difficulties" (
	"fixture_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"attacking_difficulty" double precision NOT NULL,
	"defensive_difficulty" double precision NOT NULL,
	"model_version" text NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "fixture_difficulties_fixture_id_team_id_model_version_pk" PRIMARY KEY("fixture_id","team_id","model_version")
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"provider_id" uuid,
	"external_id" text,
	"round" integer NOT NULL,
	"kickoff_at" timestamp with time zone NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"status" "fixture_status" DEFAULT 'SCHEDULED' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "injuries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"description" text NOT NULL,
	"occurred_on" date,
	"expected_return_on" date,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lineup_players" (
	"lineup_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"role" text NOT NULL,
	"slot" integer NOT NULL,
	"expected_points" double precision,
	"actual_points" double precision,
	CONSTRAINT "lineup_players_lineup_id_player_id_pk" PRIMARY KEY("lineup_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "lineups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fantasy_team_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"formation" text NOT NULL,
	"model_version" text NOT NULL,
	"expected_points" double precision,
	"actual_points" double precision,
	"generated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"finalized_at" timestamp with time zone,
	"provider_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"raw_text" text,
	"structured_signals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_feature_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"fixture_id" uuid NOT NULL,
	"feature_version" text NOT NULL,
	"features" jsonb NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_match_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"provider_id" uuid,
	"started" boolean DEFAULT false NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"shots" integer,
	"shots_on_target" integer,
	"key_passes" integer,
	"xg" double precision,
	"xa" double precision,
	"recoveries" integer,
	"interceptions" integer,
	"tackles" integer,
	"clearances" integer,
	"saves" integer,
	"yellow_cards" integer DEFAULT 0 NOT NULL,
	"red_cards" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_news" (
	"player_id" uuid NOT NULL,
	"news_article_id" uuid NOT NULL,
	"confidence" double precision,
	CONSTRAINT "player_news_player_id_news_article_id_pk" PRIMARY KEY("player_id","news_article_id")
);
--> statement-breakpoint
CREATE TABLE "player_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"fixture_id" uuid NOT NULL,
	"model_version" text NOT NULL,
	"expected_fantasy_points" double precision NOT NULL,
	"fis" double precision NOT NULL,
	"confidence" double precision,
	"explanation" jsonb NOT NULL,
	"predicted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_price_history" (
	"player_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_price_history_player_id_provider_id_captured_at_pk" PRIMARY KEY("player_id","provider_id","captured_at")
);
--> statement-breakpoint
CREATE TABLE "player_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "player_status" NOT NULL,
	"reason" text,
	"confidence" double precision,
	"source_url" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"shirt_number" integer,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"birth_date" date,
	"nationality" text,
	"preferred_position" "player_position" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"fixture_id" uuid,
	"kind" text NOT NULL,
	"score" double precision NOT NULL,
	"confidence" double precision,
	"explanation" jsonb NOT NULL,
	"model_version" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"provider_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"position" integer NOT NULL,
	"played" integer NOT NULL,
	"points" integer NOT NULL,
	"goals_for" integer NOT NULL,
	"goals_against" integer NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	CONSTRAINT "standings_season_id_team_id_round_pk" PRIMARY KEY("season_id","team_id","round")
);
--> statement-breakpoint
CREATE TABLE "suspensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"starts_round" integer NOT NULL,
	"ends_round" integer,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_match_stats" (
	"fixture_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"provider_id" uuid,
	"possession" double precision,
	"shots" integer,
	"shots_on_target" integer,
	"xg" double precision,
	"corners" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_match_stats_fixture_id_team_id_pk" PRIMARY KEY("fixture_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "team_news" (
	"team_id" uuid NOT NULL,
	"news_article_id" uuid NOT NULL,
	"confidence" double precision,
	CONSTRAINT "team_news_team_id_news_article_id_pk" PRIMARY KEY("team_id","news_article_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"slug" text NOT NULL,
	"crest_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_import_runs" ADD CONSTRAINT "data_import_runs_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_player_snapshots" ADD CONSTRAINT "fantasy_player_snapshots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_player_snapshots" ADD CONSTRAINT "fantasy_player_snapshots_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_player_snapshots" ADD CONSTRAINT "fantasy_player_snapshots_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_squad_players" ADD CONSTRAINT "fantasy_squad_players_fantasy_team_id_fantasy_teams_id_fk" FOREIGN KEY ("fantasy_team_id") REFERENCES "public"."fantasy_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_squad_players" ADD CONSTRAINT "fantasy_squad_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_difficulties" ADD CONSTRAINT "fixture_difficulties_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_difficulties" ADD CONSTRAINT "fixture_difficulties_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injuries" ADD CONSTRAINT "injuries_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_players" ADD CONSTRAINT "lineup_players_lineup_id_lineups_id_fk" FOREIGN KEY ("lineup_id") REFERENCES "public"."lineups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_players" ADD CONSTRAINT "lineup_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_fantasy_team_id_fantasy_teams_id_fk" FOREIGN KEY ("fantasy_team_id") REFERENCES "public"."fantasy_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_feature_snapshots" ADD CONSTRAINT "player_feature_snapshots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_feature_snapshots" ADD CONSTRAINT "player_feature_snapshots_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_news" ADD CONSTRAINT "player_news_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_news" ADD CONSTRAINT "player_news_news_article_id_news_articles_id_fk" FOREIGN KEY ("news_article_id") REFERENCES "public"."news_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_predictions" ADD CONSTRAINT "player_predictions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_predictions" ADD CONSTRAINT "player_predictions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_price_history" ADD CONSTRAINT "player_price_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_price_history" ADD CONSTRAINT "player_price_history_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_statuses" ADD CONSTRAINT "player_statuses_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_teams" ADD CONSTRAINT "player_teams_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_teams" ADD CONSTRAINT "player_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_teams" ADD CONSTRAINT "player_teams_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_match_stats" ADD CONSTRAINT "team_match_stats_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_match_stats" ADD CONSTRAINT "team_match_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_match_stats" ADD CONSTRAINT "team_match_stats_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_news" ADD CONSTRAINT "team_news_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_news" ADD CONSTRAINT "team_news_news_article_id_news_articles_id_fk" FOREIGN KEY ("news_article_id") REFERENCES "public"."news_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competitions_slug_uq" ON "competitions" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "competitions_provider_external_uq" ON "competitions" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "data_providers_code_uq" ON "data_providers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "fantasy_snapshots_player_provider_captured_uq" ON "fantasy_player_snapshots" USING btree ("player_id","provider_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fixtures_provider_external_uq" ON "fixtures" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fixtures_natural_uq" ON "fixtures" USING btree ("season_id","home_team_id","away_team_id","kickoff_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lineups_team_round_model_uq" ON "lineups" USING btree ("fantasy_team_id","round","model_version");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_fixture_uq" ON "matches" USING btree ("fixture_id");--> statement-breakpoint
CREATE UNIQUE INDEX "news_provider_external_uq" ON "news_articles" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "news_url_uq" ON "news_articles" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_snapshots_player_fixture_version_uq" ON "player_feature_snapshots" USING btree ("player_id","fixture_id","feature_version");--> statement-breakpoint
CREATE UNIQUE INDEX "player_match_stats_fixture_player_provider_uq" ON "player_match_stats" USING btree ("fixture_id","player_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "predictions_player_fixture_model_uq" ON "player_predictions" USING btree ("player_id","fixture_id","model_version");--> statement-breakpoint
CREATE UNIQUE INDEX "player_teams_period_uq" ON "player_teams" USING btree ("player_id","team_id","season_id","starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "players_slug_uq" ON "players" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "players_provider_external_uq" ON "players" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_competition_name_uq" ON "seasons" USING btree ("competition_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_provider_external_uq" ON "seasons" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_uq" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_provider_external_uq" ON "teams" USING btree ("provider_id","external_id");
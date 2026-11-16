import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `CREATE TABLE stages (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(30) NOT NULL,
            type ENUM('watched', 'paused', 'final') NOT NULL,
            threshold_days SMALLINT UNSIGNED NULL COMMENT 'watched stages only, 1-90',
            position SMALLINT UNSIGNED NOT NULL,
            aliases JSON NOT NULL COMMENT 'other names used in CSV files',
            action_code ENUM(
                'REVIEW_APPLICATION',
                'SCHEDULE_SCREEN',
                'REQUEST_FEEDBACK',
                'REVIEW_ASSESSMENT',
                'CHASE_REFERENCES',
                'CONFIRM_OFFER',
                'GENERIC_FOLLOW_UP'
            ) NULL COMMENT 'watched stages only',
            created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            UNIQUE KEY uq_stages_name (name),
            UNIQUE KEY uq_stages_position (position)
        )`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("stages");
};

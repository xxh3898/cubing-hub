package com.cube.cube_server.dto;

import com.cube.cube_server.domain.Record;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

public class RecordDto {

    @Getter
    @AllArgsConstructor
    public static class Create {
        private Long id;
        private Double time;
        private String scramble;

        public Record toEntity() {
            return Record.builder().
                    id(id).
                    time(time).
                    scramble(scramble).
                    build();
        }
    }

    @Getter
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long id;
        private Double time;
        private String scramble;

        public static Response of(Record record) {
            return Response.builder().
                    id(record.getId()).
                    time(record.getTime()).
                    scramble(record.getScramble()).
                    build();
        }
    }
}
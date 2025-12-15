package com.cube.cube_server.dto;

import com.cube.cube_server.domain.Record;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class RecordDto {
    private Long id;
    private Double time;
    private String scramble;
    private LocalDateTime date;
    private String memberId;

    public RecordDto(Record record) {
        this.id = record.getId();
        this.time = record.getTime();
        this.scramble = record.getScramble();

        if (record.getMember() != null) {
            this.memberId = record.getMember().getId();
        }

        this.date = record.getCreateTime();
    }
}
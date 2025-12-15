package com.cube.cube_server.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "RECORDS")
public class Record extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "record_id")
    private Long id;

    @Column(nullable = false)
    private Double time;

    @Column(nullable = false)
    private String scramble;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    public Record(Double time, String scramble) {
        this.time = time;
        this.scramble = scramble;
    }

    public void setMember(Member member) {
        this.member = member;
        member.getRecords().add(this);
    }
}